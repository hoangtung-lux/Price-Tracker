import os

# Configuration
SECRET_SALT = "VH_SALT_2026"
STRINGS_TO_ENCRYPT = {
    "GWD_API": "https://api.gwdang.com/extension/price_towards",
    "MMB_API": "https://tool.manmanbuy.com/history.aspx",
    "MMB_COUPON_API": "https://tool.manmanbuy.com/history.aspx?DA=1&action=getcoupon",
    "REF_GWD": "https://www.gwdang.com/",
    "REF_MMB": "https://tool.manmanbuy.com/"
}
TARGET_DOMAINS = ["item.taobao.com", "item.jd.com", "detail.tmall.com", "detail.1688.com"]

def xor_encrypt(text, domain):
    key = domain + SECRET_SALT
    encrypted = ""
    for i, char in enumerate(text):
        encrypted += format(ord(char) ^ ord(key[i % len(key)]), '02x')
    return encrypted

def run():
    print("Vault Builder: Encrypting sensitive strings...")
    
    # We use a generic key part for stable decryption across subdomains
    # Let's say we use 'taobao.com' as the base for the key since it's the most common
    # Or better: the script will detect the base domain at runtime.
    # For the BUILD step, we'll just show the encrypted values for taobao.com as a sample
    # and provide a way for the user to see them.
    
    # Actually, to be STABLE, let's use a fixed secret key first, 
    # and combine it with a dynamic part if needed.
    
    # For now, let's use a STATIC SECRET but complex enough path.
    FINAL_KEY = "PT_PRO_MAX_2026_BY_HOANG_TUNG"
    
    for key_name, value in STRINGS_TO_ENCRYPT.items():
        cipher = ""
        for i, char in enumerate(value):
            cipher += format(ord(char) ^ ord(FINAL_KEY[i % len(FINAL_KEY)]), '02x')
        print(f"  {key_name}: {cipher}")

if __name__ == "__main__":
    run()
