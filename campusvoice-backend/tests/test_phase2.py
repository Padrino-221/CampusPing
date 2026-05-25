import pytest
from app.utils.phone import normalize_phone, chunk_list
from app.utils.sms import detect_unicode, calculate_sms_units, get_gsm7_message_length
from app.services.arkesel import arkesel

def test_phone_normalization():
    # Test local Ghanaian formats
    assert normalize_phone("0241234567") == "0241234567"
    assert normalize_phone(" 024-123 4567 ") == "0241234567"
    
    # Test international prefix formats
    assert normalize_phone("+233241234567") == "0241234567"
    assert normalize_phone("233241234567") == "0241234567"
    
    # Test short numbers without prefix
    assert normalize_phone("241234567") == "0241234567"
    
    # Empty inputs
    assert normalize_phone("") == ""
    assert normalize_phone(None) == ""


def test_chunk_list():
    lst = list(range(250))
    chunks = chunk_list(lst, 100)
    
    assert len(chunks) == 3
    assert len(chunks[0]) == 100
    assert len(chunks[1]) == 100
    assert len(chunks[2]) == 50
    assert chunks[0][0] == 0
    assert chunks[2][-1] == 249
    
    # Edge case empty lists
    assert chunk_list([], 100) == []


def test_detect_unicode():
    # Standard characters
    assert not detect_unicode("Hello, world!")
    assert not detect_unicode("Standard characters only @123 \n\r")
    
    # Unicode characters
    assert detect_unicode("Hello, world! 🚀")      # Emoji — clearly unicode
    assert detect_unicode("KWAME ₵")               # Ghanaian Cedi symbol ₵ is outside GSM-7
    assert detect_unicode("你好")                    # Chinese characters — outside GSM-7
    # Note: € IS a valid GSM-7 extension character — detect_unicode("€") would correctly return False


def test_get_gsm7_message_length():
    # Regular chars count as 1
    assert get_gsm7_message_length("Hello") == 5
    
    # GSM-7 Extension characters count as 2
    assert get_gsm7_message_length("{Hello}") == 9 # '{' and '}' count as 2 each, plus 5 regular characters = 9
    assert get_gsm7_message_length("[Hi]") == 6    # '[' and ']' count as 2 each, plus 2 regular characters = 6


def test_calculate_sms_units():
    # GSM-7 single part
    assert calculate_sms_units("Hello") == 1
    assert calculate_sms_units("a" * 160) == 1
    
    # GSM-7 multi-part (161+ characters partition into 153-character parts)
    assert calculate_sms_units("a" * 161) == 2  # 161 chars -> part 1 (153), part 2 (8)
    assert calculate_sms_units("a" * 306) == 2  # 306 chars -> part 1 (153), part 2 (153)
    assert calculate_sms_units("a" * 307) == 3  # 307 chars -> part 1 (153), part 2 (153), part 3 (1)

    # GSM-7 with extension characters
    # { } count as 2 chars each. "a" * 157 + "{" + "}" = 157 + 2 + 2 = 161 chars -> 2 units
    assert calculate_sms_units("a" * 157 + "{}") == 2
    
    # Unicode single part
    assert calculate_sms_units("Hello ₵") == 1 # ₵ makes it unicode, len is 7 -> 1 unit
    assert calculate_sms_units("₵" * 70) == 1
    
    # Unicode multi-part (71+ characters partition into 67-character parts)
    assert calculate_sms_units("₵" * 71) == 2  # 71 chars -> part 1 (67), part 2 (4)
    assert calculate_sms_units("₵" * 134) == 2 # 134 chars -> part 1 (67), part 2 (67)
    assert calculate_sms_units("₵" * 135) == 3 # 135 chars -> part 1 (67), part 2 (67), part 3 (1)


def test_arkesel_mock_calls():
    # Send bulk mock test
    res = arkesel.send_bulk_sync("KWAME4SRC", "Vote for Kwame!", ["0241234567"])
    assert res["status"] == "success"
    assert "data" in res
    assert "id" in res["data"]
    
    # Check balance mock test
    bal = arkesel.check_balance_sync()
    assert bal["status"] == "success"
    assert bal["data"]["balance"] == 5000
    
    # Get delivery report mock test
    rep = arkesel.get_delivery_report_sync("some-id")
    assert rep["status"] == "success"
    assert rep["data"]["status"] in ["delivered", "failed", "undelivered"]
