import asyncio, httpx

async def test():
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:8719/api/auth/login", json={
            "email": "admin@campusvoice.com",
            "password": "adminpassword123"
        })
        cookies = resp.cookies
        print(f"Login: {resp.status_code}")

        endpoints = [
            "GET /api/admin/revenue",
            "GET /api/admin/sender-ids/pending",
            "GET /api/admin/candidates",
            "GET /api/admin/institutions",
            "GET /api/admin/students",
            "GET /api/admin/campaigns",
            "GET /api/admin/credit-packages",
        ]
        for ep in endpoints:
            meth, path = ep.split(" ", 1)
            r = await client.request(meth, f"http://127.0.0.1:8719{path}", cookies=cookies)
            print(f"  {path}: {'OK' if r.status_code == 200 else f'FAIL({r.status_code})'}")

        # Create institution
        r = await client.post("http://127.0.0.1:8719/api/admin/institutions",
            json={"name": "Test Uni", "slug": "test-uni", "country": "Ghana"},
            cookies=cookies)
        print(f"  POST /api/admin/institutions: {r.status_code} {r.json()}")
        inst_id = r.json().get("id")

        # Update institution
        if inst_id:
            r = await client.put(f"http://127.0.0.1:8719/api/admin/institutions/{inst_id}",
                json={"name": "Test Uni Updated"}, cookies=cookies)
            print(f"  PUT /api/admin/institutions/{{id}}: {r.status_code} {r.json()}")

        # Delete institution
        if inst_id:
            r = await client.delete(f"http://127.0.0.1:8719/api/admin/institutions/{inst_id}", cookies=cookies)
            print(f"  DELETE /api/admin/institutions/{{id}}: {r.status_code} {r.json()}")

        # Create credit package
        r = await client.post("http://127.0.0.1:8719/api/admin/credit-packages",
            json={"name": "Test Pack", "credits": 50, "price_ghs": 5.0},
            cookies=cookies)
        print(f"  POST /api/admin/credit-packages: {r.status_code} {r.json()}")
        pkg_id = r.json().get("id")

        # Delete credit package
        if pkg_id:
            r = await client.delete(f"http://127.0.0.1:8719/api/admin/credit-packages/{pkg_id}", cookies=cookies)
            print(f"  DELETE /api/admin/credit-packages/{{id}}: {r.status_code} {r.json()}")

asyncio.run(test())
