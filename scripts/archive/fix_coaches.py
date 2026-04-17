# -*- coding: utf-8 -*-
import re

path = r'c:\Users\Frank\Desktop\Antigravity MIKE\platform\app\coaches\page.js'

with open(path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

fixed_lines = []
for line in lines:
    # Fix any broken split regex on service_areas - replace with a simple comma split
    if 'service_areas' in line and 'split(' in line and 'filter(Boolean)' in line:
        # Replace entire split expression with safe ASCII-only version
        line = re.sub(
            r'c\.service_areas\.split\([^)]+\)',
            "c.service_areas.split(',').map(x=>x.replace(/[^\\w\\s\\u4e00-\\u9fff]/g,'').trim()).filter(Boolean).flatMap(x=>x.split(/\\s*[\\u3001\\uff0c,]\\s*/))",
            line
        )
        # Simpler replacement - just split on comma
        line = re.sub(
            r'c\.service_areas\.split\([^)]+\)\.map\(s => s\.trim\(\)\)\.filter\(Boolean\)',
            "c.service_areas.replace(/[\u3001\uff0c]/g, ',').split(',').map(s => s.trim()).filter(Boolean)",
            line
        )
    fixed_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print('Done. Checking result:')
with open(path, 'r', encoding='utf-8') as f:
    all_lines = f.readlines()
for i, l in enumerate(all_lines):
    if 'service_areas' in l and 'split' in l:
        print(f'  Line {i+1}: {l.rstrip()}')
