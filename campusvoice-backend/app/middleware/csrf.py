from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Verify that state-changing requests include X-Requested-With header.
    Cross-origin sites cannot set custom headers without a CORS preflight,
    so this blocks CSRF attacks even if cookies are sent.
    """

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
    EXEMPT_PATHS = {"/api/credits/webhook"}

    async def dispatch(self, request: Request, call_next):
        if request.method not in self.SAFE_METHODS:
            if request.url.path not in self.EXEMPT_PATHS:
                if request.headers.get("X-Requested-With") != "XMLHttpRequest":
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Missing CSRF header"},
                    )
        return await call_next(request)
