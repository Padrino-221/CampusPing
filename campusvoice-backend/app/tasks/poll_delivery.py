from app.tasks.celery_app import celery_app
from app.services.arkesel import arkesel
from app.database import get_sync_db
from app.models.campaign import CampaignLog
from datetime import datetime

@celery_app.task
def poll_pending_logs():
    """
    Celery Beat task that automatically runs on a schedule to poll Arkesel
    for delivery reports of outstanding 'sent' SMS messages.
    """
    db = get_sync_db()
    try:
        # Fetch up to 500 logs that are marked as dispatched but not yet confirmed
        pending_logs = db.query(CampaignLog).filter(
            CampaignLog.status == "sent",
            CampaignLog.arkesel_msg_id.isnot(None)
        ).limit(500).all()

        if not pending_logs:
            return

        updated_count = 0
        for log in pending_logs:
            try:
                # Query SMS provider for status
                report = arkesel.get_delivery_report_sync(log.arkesel_msg_id)
                
                # Check status
                data = report.get("data", {})
                
                # Arkesel status can be a direct status field or nested under data
                status = None
                if isinstance(data, dict):
                    status = data.get("status")
                
                # Normalize status strings to lower case for consistency
                if status:
                    status = status.lower()

                if status == "delivered":
                    log.status = "delivered"
                    log.delivered_at = datetime.utcnow()
                    updated_count += 1
                elif status in ["failed", "rejected", "undelivered"]:
                    log.status = "failed"
                    log.error_message = f"Provider marked as: {status}"
                    updated_count += 1
                    
            except Exception as log_err:
                print(f"[Celery Beat] Failed to poll status for log {log.id}: {log_err}")

        # Commit changes if any updates occurred
        if updated_count > 0:
            db.commit()
            print(f"[Celery Beat] Polled and successfully updated {updated_count} student delivery logs.")
            
    except Exception as exc:
        print(f"[Celery Beat] Delivery report polling task crashed: {exc}")
    finally:
        db.close()
