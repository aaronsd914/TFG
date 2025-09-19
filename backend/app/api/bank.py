# backend/app/api/bank.py
from fastapi import APIRouter, HTTPException, Request
import requests, uuid, logging, time
from backend.app.bank_settings import (
    DEMO,
    HUB_OAUTH_BASE, HUB_API_BASE,
    CAIXA_CLIENT_ID, CAIXA_CLIENT_SECRET,
    CAIXA_REDIRECT_URI, ASPSP_CODE,
    REQUEST_TIMEOUT,
)

router = APIRouter(prefix="/api/bank/caixa", tags=["bank"])
log = logging.getLogger("bank")

# Token global en memoria (solo demo/sandbox)
_TOKEN = None

def _xid():
    return str(uuid.uuid4())

# ===== Debug & Estado =====
@router.get("/_debug")
def debug():
    return {
        "DEMO": DEMO,
        "id_len": len(CAIXA_CLIENT_ID or ""),
        "secret_len": len(CAIXA_CLIENT_SECRET or ""),
        "redirect": CAIXA_REDIRECT_URI,
        "token": bool(_TOKEN),
    }

@router.get("/status")
def status():
    return {
        "linked": bool(_TOKEN),
        "demo": DEMO,
        "token_expires_in": _TOKEN.get("expires_in") if _TOKEN else None,
    }

# ===== Flujo de enlace (consent + redirect) =====
@router.post("/link")
def link_start(request: Request):
    """
    Crea un consent y devuelve la URL de autorización de CaixaBank.
    """
    consent_body = {
        "access": {"balances": [], "transactions": []},
        "recurringIndicator": True,
        "validUntil": "2099-12-31",
        "frequencyPerDay": 4,
        "combinedServiceIndicator": False,
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "X-Request-ID": _xid(),
        "PSU-IP-Address": request.client.host or "127.0.0.1",
        "TPP-Redirect-Preferred": "true",
        "TPP-Redirect-URI": CAIXA_REDIRECT_URI,
        "TPP-Nok-Redirect-URI": CAIXA_REDIRECT_URI,
        "X-ASPSP": ASPSP_CODE,
        # Cabeceras del portal IBM
        "X-IBM-Client-Id": CAIXA_CLIENT_ID,
        "X-IBM-Client-Secret": CAIXA_CLIENT_SECRET,
    }

    consent_url = f"{HUB_API_BASE}/consents?aspsp={ASPSP_CODE}"

    last = None
    for i in range(3):
        r = requests.post(consent_url, json=consent_body, headers=headers, timeout=REQUEST_TIMEOUT)
        last = r
        if r.status_code in (200, 201):
            break
        if 500 <= r.status_code < 600:
            log.warning("Consent %s (intento %s): %s", r.status_code, i+1, r.text)
            time.sleep(0.8 * (i+1))

    if last.status_code not in (200, 201):
        log.error("Consent error %s: %s", last.status_code, last.text)
        raise HTTPException(502, f"Error creando consent ({last.status_code})")

    consent_id = (last.json() or {}).get("consentId")
    if not consent_id:
        raise HTTPException(502, f"Respuesta sin consentId: {last.text}")

    # Construir la URL de autorización
    auth_url = (
        f"{HUB_OAUTH_BASE}/authorize?"
        f"response_type=code&client_id={CAIXA_CLIENT_ID}"
        f"&scope=AIS:{consent_id}&redirect_uri={CAIXA_REDIRECT_URI}"
    )

    return {"redirect_url": auth_url}

# ===== Callback OAuth2 =====
@router.get("/callback")
def link_callback(code: str = None, error: str = None):
    global _TOKEN
    if error:
        raise HTTPException(400, f"OAuth error: {error}")
    if not code:
        raise HTTPException(400, "Missing code")

    token_url = f"{HUB_OAUTH_BASE}/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": CAIXA_REDIRECT_URI,
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "X-IBM-Client-Id": CAIXA_CLIENT_ID,
        "X-IBM-Client-Secret": CAIXA_CLIENT_SECRET,
    }

    r = requests.post(token_url, data=data, headers=headers, timeout=REQUEST_TIMEOUT)
    if r.status_code != 200:
        raise HTTPException(502, f"Token error {r.status_code}: {r.text}")

    _TOKEN = r.json()
    return {"linked": True, "token": _TOKEN}

# ===== Ejemplo: cuentas =====
@router.get("/accounts")
def get_accounts():
    if not _TOKEN:
        raise HTTPException(401, "No está enlazado todavía")

    url = f"{HUB_API_BASE}/accounts?aspsp={ASPSP_CODE}"
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {_TOKEN['access_token']}",
        "X-IBM-Client-Id": CAIXA_CLIENT_ID,
        "X-IBM-Client-Secret": CAIXA_CLIENT_SECRET,
        "X-Request-ID": _xid(),
    }

    r = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
    if r.status_code != 200:
        raise HTTPException(r.status_code, f"Accounts error {r.text}")
    return r.json()
