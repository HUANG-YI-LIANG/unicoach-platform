import re
import os
import shutil
from datetime import datetime

def fix_coaches_page():
    # 使用相對路徑，確保在 platform 下運行正確
    path = os.path.join('app', 'coaches', 'page.js')
    
    if not os.path.exists(path):
        print(f"❌ Error: File {path} not found.")
        return False
        
    # ✅ 創建備份
    backup_path = f"{path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(path, backup_path)
    print(f"✅ Backup created: {backup_path}")
    
    try:
        # 安全讀取
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
    except UnicodeDecodeError:
        print("⚠️ Encoding issue detected, using fallback...")
        with open(path, 'rb') as f:
            text = f.read().decode('utf-8', errors='ignore')
            
    original_text = text
    
    # 修復邏輯
    fixes = [
        (r'<h1 className="page-title">.*?</h1>', r'<h1 className="page-title">找教練</h1>'),
        (r'>\s*[^<]*\?\s*</button>', r'>全部</button>'),
        (r'service_areas\.split\(/[^/]+/\)', r"service_areas.split(/[,、]/)"),
        (r'setSelectedSkill\([^\)]+\)', r"setSelectedSkill('全部')"),
        (r"selectedSkill === \'[^\']*\' \? \'active\'", r"selectedSkill === '全部' ? 'active'"),
    ]
    
    for pattern, replacement in fixes:
        text = re.sub(pattern, replacement, text)
        
    # ✅ 驗證是否有實際修改
    if text != original_text:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        print('✅ Successfully applied fixes to page.js')
        return True
    else:
        print('ℹ️ No changes needed')
        # 如果沒有變化，可以選擇保留備份或移除
        # os.remove(backup_path) 
        return False

if __name__ == "__main__":
    fix_coaches_page()
