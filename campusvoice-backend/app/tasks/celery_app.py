from celery import Celery
from celery.schedules import crontab
from app.config import settings

_redis_available = False

if settings.REDIS_URL:
    broker_url = settings.REDIS_URL
    _redis_available = True
elif settings.ENVIRONMENT == "development":
    broker_url = "redis://localhost:6379/0"
    _redis_available = True
    print("[Celery] No REDIS_URL set, using redis://localhost:6379/0 for development")
else:
    broker_url = ""
    print("[Celery] REDIS_URL not set — Celery disabled in production")

celery_app = Celery(
    "campusvoice",
    broker=broker_url,
    backend=broker_url,
    include=["app.tasks.send_campaign", "app.tasks.poll_delivery"] if _redis_available else []
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Accra",
    enable_utc=True,
)

if _redis_available:
    celery_app.conf.beat_schedule = {
        "poll-delivery-every-60-sec": {
            "task": "app.tasks.poll_delivery.poll_pending_logs",
            "schedule": 60.0,
        }
    }
