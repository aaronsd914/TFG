"""Tests para /api/config — GET y PUT de configuración de la tienda."""

# ── Tests ────────────────────────────────────────────────────────────────────
class TestReadConfig:
    def test_devuelve_defaults(self, client):
        r = client.get("/api/config")
        assert r.status_code == 200
        body = r.json()
        assert body["tienda_nombre"] == "FurniGest"
        assert body["logo_empresa"] == ""
        assert body["firma_email"] == ""
        assert body["resumen_email_destino"] == ""
        assert body["resumen_intervalo_dias"] == "7"
        assert "resumen_ultima_vez" in body

    def test_devuelve_valor_almacenado(self, client):
        client.put("/api/config/tienda_nombre", json={"key": "tienda_nombre", "value": "Mi Tienda"})
        r = client.get("/api/config")
        assert r.status_code == 200
        assert r.json()["tienda_nombre"] == "Mi Tienda"

    def test_contiene_todas_las_claves(self, client):
        r = client.get("/api/config")
        assert r.status_code == 200
        body = r.json()
        expected = {
            "tienda_nombre",
            "logo_empresa",
            "firma_email",
            "resumen_email_destino",
            "resumen_intervalo_dias",
            "resumen_ultima_vez",
        }
        assert expected.issubset(body.keys())


class TestWriteConfig:
    def test_actualizar_tienda_nombre(self, client):
        r = client.put(
            "/api/config/tienda_nombre",
            json={"key": "tienda_nombre", "value": "Nueva Tienda"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["key"] == "tienda_nombre"
        assert body["value"] == "Nueva Tienda"

    def test_actualizar_firma_email(self, client):
        r = client.put(
            "/api/config/firma_email",
            json={"key": "firma_email", "value": "Saludos, FurniGest"},
        )
        assert r.status_code == 200
        assert r.json()["value"] == "Saludos, FurniGest"

    def test_actualizar_email_destino(self, client):
        r = client.put(
            "/api/config/resumen_email_destino",
            json={"key": "resumen_email_destino", "value": "test@example.com"},
        )
        assert r.status_code == 200
        assert r.json()["value"] == "test@example.com"

    def test_actualizar_intervalo_dias(self, client):
        r = client.put(
            "/api/config/resumen_intervalo_dias",
            json={"key": "resumen_intervalo_dias", "value": "14"},
        )
        assert r.status_code == 200
        assert r.json()["value"] == "14"

    def test_valor_vacio(self, client):
        r = client.put(
            "/api/config/firma_email",
            json={"key": "firma_email", "value": ""},
        )
        assert r.status_code == 200
        assert r.json()["value"] == ""

    def test_clave_desconocida_devuelve_400(self, client):
        r = client.put(
            "/api/config/clave_inexistente",
            json={"key": "clave_inexistente", "value": "algo"},
        )
        assert r.status_code == 400

    def test_put_luego_get_refleja_cambio(self, client):
        """Round-trip: PUT + GET deben devolver el mismo valor."""
        client.put(
            "/api/config/tienda_nombre",
            json={"key": "tienda_nombre", "value": "RoundTrip"},
        )
        r = client.get("/api/config")
        assert r.status_code == 200
        assert r.json()["tienda_nombre"] == "RoundTrip"

    def test_sobreescribir_valor_existente(self, client):
        """Dos PUT seguidos al mismo key deben conservar el último valor."""
        client.put(
            "/api/config/tienda_nombre",
            json={"key": "tienda_nombre", "value": "Primero"},
        )
        client.put(
            "/api/config/tienda_nombre",
            json={"key": "tienda_nombre", "value": "Segundo"},
        )
        r = client.get("/api/config")
        assert r.status_code == 200
        assert r.json()["tienda_nombre"] == "Segundo"

    def test_actualizar_ultima_vez(self, client):
        r = client.put(
            "/api/config/resumen_ultima_vez",
            json={"key": "resumen_ultima_vez", "value": "2025-01-15"},
        )
        assert r.status_code == 200
        assert r.json()["value"] == "2025-01-15"
