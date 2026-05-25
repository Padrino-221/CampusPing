def normalize_phone(phone: str) -> str:
    """
    Normalizes Ghanaian mobile numbers to Arkesel's expected local format: 0XXXXXXXXX.
    Accepts: '0241234567', '+233241234567', '233241234567', ' 024-123 4567 '
    """
    if not phone:
        return ""
        
    # Clean whitespace and hyphens
    phone = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    if phone.startswith("+233"):
        return "0" + phone[4:]
    elif phone.startswith("233") and len(phone) == 12:
        return "0" + phone[3:]
    elif phone.startswith("0") and len(phone) == 10:
        return phone
    elif len(phone) == 9 and not phone.startswith("0"):
        return "0" + phone
        
    return phone


def chunk_list(lst: list, size: int = 100) -> list[list]:
    """
    Chunks a list into smaller sublists of a specified maximum size.
    Used to batch recipient lists when making third-party API requests.
    """
    if not lst:
        return []
    return [lst[i:i+size] for i in range(0, len(lst), size)]
