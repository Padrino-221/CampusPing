from celery import Celery
from app.config import settings

celery_app = Celery(
    "campusvoice",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.send_campaign", "app.tasks.poll_delivery"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Accra",
    enable_utc=True,
    # Configure Celery Beat Scheduler
    beat_schedule={
        "poll-delivery-every-60-sec": {
            "task": "app.tasks.poll_delivery.poll_pending_logs",
            "schedule": 60.0,  # Run every 60 seconds for live updates
        }
    }
)
