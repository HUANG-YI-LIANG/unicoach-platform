import os
import re

path = r'c:\Users\Frank\Desktop\Antigravity MIKE\platform\app\coaches\page.js'

with open(path, 'rb') as f:
    raw_content = f.read()

text = raw_content.decode('utf-8', errors='replace')

text = re.sub(r'<h1 className="page-title">.*?\/h1>', r'<h1 className="page-title">教練列表</h1>', text)
text = re.sub(r'setSelectedSkill\([^)]+\)', r"setSelectedSkill('全部')", text)
text = re.sub(r"\(selectedSkill === \'.*?\' \? \'active\'", r"(selectedSkill === '全部' ? 'active'", text)
text = re.sub(r'>\s*.*?\s*<\/button>', r'>全部</button>', text)
text = re.sub(r'if \(selectedSkill === \'.*?\'\) return coaches;', r"if (selectedSkill === '全部') return coaches;", text)
text = re.sub(r'c\.service_areas\.split\(.*?\)', r"c.service_areas.split(/[,、]/)", text)
text = re.sub(r'\?券', '全部', text)

# Try fixing broken JSX tags directly reported by tsc:
text = text.replace('className="coach-page-wrapper"', 'className="coach-page-wrapper"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed!")
