from app.tasks.celery_app import celery_app
from app.services.arkesel import arkesel
from app.services.filter_engine import get_filtered_students_sync
from app.utils.phone import normalize_phone, chunk_list
from app.database import get_sync_db
from app.models.campaign import Campaign, CampaignLog
from app.models.sender_id import SenderID
from datetime import datetime
import uuid

@celery_app.task(bind=True, max_retries=3)
def dispatch_campaign(self, campaign_id: str):
    """
    Celery background task that orchestrates campaign sending.
    Steps:
      1. Transitions status to 'sending'.
      2. Gathers targeted student phone numbers from filter snapshots.
      3. Batches recipients to fit Arkesel API bounds.
      4. Tracks delivery logs and updates candidate campaign stats.
    """
    db = get_sync_db()
    try:
        # Retrieve campaign context
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            print(f"[Celery] Campaign context '{campaign_id}' was not found.")
            return

        # Update campaign status
        campaign.status = "sending"
        campaign.sent_at = datetime.utcnow()
        db.commit()

        # Query all student directory targets matching filters
        students = get_filtered_students_sync(db, campaign.candidate.institution_id, campaign.filters)
        
        # Build phone number mapping
        phone_student_map = {}
        for student in students:
            norm_phone = normalize_phone(student.phone)
            if norm_phone:
                phone_student_map[norm_phone] = student.id

        phones = list(phone_student_map.keys())

        # Resolve Campaign Sender ID
        sender_name = "CampusVoice"
        if campaign.sender_id_ref:
            sender = db.query(SenderID).filter(SenderID.id == campaign.sender_id_ref).first()
            if sender and sender.status == "approved":
                sender_name = sender.sender_name

        # Batch chunking
        batches = chunk_list(phones, 100)
        all_logs = []
        successful_dispatches = 0

        for batch in batches:
            try:
                # Dispatch batch through SMS provider
                result = arkesel.send_bulk_sync(sender_name, campaign.message, batch)
                
                # Check status
                status = "sent" if result.get("status") == "success" else "failed"
                msg_id = result.get("data", {}).get("id")
                err_msg = None if status == "sent" else result.get("message", "API response error")

                # Generate logs
                for phone in batch:
                    log = CampaignLog(
                        id=uuid.uuid4(),
                        campaign_id=campaign.id,
                        student_id=phone_student_map.get(phone),
                        phone=phone,
                        status=status,
                        arkesel_msg_id=msg_id,
                        error_message=err_msg,
                        sent_at=datetime.utcnow()
                    )
                    all_logs.append(log)
                    if status == "sent":
                        successful_dispatches += 1

            except Exception as batch_err:
                print(f"[Celery] Exception occurred during batch dispatch: {batch_err}")
                # Log batch as failed
                for phone in batch:
                    log = CampaignLog(
                        id=uuid.uuid4(),
                        campaign_id=campaign.id,
                        student_id=phone_student_map.get(phone),
                        phone=phone,
                        status="failed",
                        error_message=str(batch_err),
                        sent_at=datetime.utcnow()
                    )
                    all_logs.append(log)

        # Bulk save log entities
        if all_logs:
            db.bulk_save_objects(all_logs)

        # Complete campaign
        campaign.status = "completed"
        campaign.recipient_count = len(phones)
        db.commit()
        print(f"[Celery] Campaign '{campaign_id}' dispatched successfully to {successful_dispatches}/{len(phones)} voters.")

    except Exception as exc:
        db.rollback()
        # Mark campaign as failed
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.status = "failed"
            db.commit()
        print(f"[Celery] Campaign dispatch '{campaign_id}' encountered exception: {exc}. Retrying...")
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
