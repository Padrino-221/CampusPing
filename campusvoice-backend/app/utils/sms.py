GSM7_CHARS = set(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !\""
    "#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "ÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyz äöñüà"
)

# Standard GSM-7 extension characters that count as 2 characters in GSM-7 encoding
GSM7_EXTENSION_CHARS = set("^{}\\[~]|€")

def detect_unicode(message: str) -> bool:
    """
    Returns True if the message contains any character outside the standard GSM-7 character set.
    """
    if not message:
        return False
    return any(c not in GSM7_CHARS and c not in GSM7_EXTENSION_CHARS for c in message)


def get_gsm7_message_length(message: str) -> int:
    """
    Calculates the virtual character length of a GSM-7 message, taking into account
    that GSM-7 extension characters (e.g. [, ], {, }, |, ~, ^) count as 2 characters.
    """
    length = 0
    for c in message:
        if c in GSM7_EXTENSION_CHARS:
            length += 2
        else:
            length += 1
    return length


def calculate_sms_units(message: str) -> int:
    """
    Calculates the total number of SMS billing units required for a given message.
    GSM-7 standards:
      - Single message: up to 160 characters.
      - Multi-part message: batches of 153 characters per part.
    Unicode standards:
      - Single message: up to 70 characters.
      - Multi-part message: batches of 67 characters per part.
    Non-BMP characters (emoji) count as 2 UCS-2 code units and are billed accordingly.
    """
    if not message:
        return 0

    is_unicode = detect_unicode(message)

    if is_unicode:
        length = 0
        for c in message:
            if ord(c) > 0xFFFF:
                length += 2
            else:
                length += 1
        if length <= 70:
            return 1
        return -(-length // 67)
    else:
        length = get_gsm7_message_length(message)
        if length <= 160:
            return 1
        return -(-length // 153)
