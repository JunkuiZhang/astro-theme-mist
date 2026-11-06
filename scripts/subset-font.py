"""Optional font maintenance: python subset-font.py /path/to/ChillRoundF.ttf.

Requires fonttools and brotli. Generated WOFF2 files are committed assets;
normal development and CI do not need Python or access to the font source.
"""
import re
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
output = root / 'src/assets/fonts'
output.mkdir(parents=True, exist_ok=True)
all_codes = set(TTFont(source).getBestCmap())
ui = '张小白的小窝文章归档标签关于全部学习教程随笔首页搜索加载更多雾白主题切换返回正文'
for file in (root / 'src/content/posts').rglob('*.md'):
    frontmatter = file.read_text().split('---', 2)
    if len(frontmatter) > 2:
        ui += ''.join(re.findall(r'^(?:title|category|tags):\s*(.*)$', frontmatter[1], re.M))
core = ({ord(c) for c in ui} | set(range(32, 256)) | set(range(0x3000, 0x3040))) & all_codes
remaining = sorted(all_codes - core)
groups = [('core', sorted(core))] + [(f'{i // 512:02}', remaining[i:i + 512]) for i in range(0, len(remaining), 512)]
rules = []
for name, codes in groups:
    font = TTFont(source)
    options = subset.Options()
    options.flavor = 'woff2'
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=codes)
    sub.subset(font)
    # Respect the original font's reserved names for these derived subsets.
    for entry in font['name'].names:
        if entry.nameID in (1, 3, 4, 6, 16, 17):
            replacement = 'Regular' if entry.nameID == 17 else ('MistRound-Regular' if entry.nameID in (3, 6) else 'Mist Round')
            entry.string = replacement.encode(entry.getEncoding())
    font.flavor = 'woff2'
    filename = f'mist-round-{name}.woff2'
    font.save(output / filename)
    ranges = ','.join(f'U+{c:X}' for c in codes)
    rules.append(f"@font-face {{ font-family: 'Mist Round'; font-style: normal; font-weight: 400; font-display: swap; src: url('../assets/fonts/{filename}') format('woff2'); unicode-range: {ranges}; }}")
(root / 'src/styles/round-font.css').write_text('/* Derived from ChillRoundF. See public/fonts/OFL.txt. */\n' + '\n'.join(rules) + '\n')
print(f'{len(groups)} font subsets; core: {(output / "mist-round-core.woff2").stat().st_size:,} bytes')
