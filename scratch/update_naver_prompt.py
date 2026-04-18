import re
import os

path = r'src\App.tsx'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Update the Naver blog style instructions in the prompt
old_instr = r"""        [포스팅 1: 네이버 블로그 스타일]
        ${naverPersona}
        - 제목: 클릭을 유발하는 감성적이고 호기심을 자극하는 제목
        - 본문: HTML 태그 사용, 친근한 문체, 풍부한 이모지, {{IMAGE:라벨명}} 삽입, 정보(Table) 및 인용구(Blockquote) 활용.
        - 태그: 네이버 인기 태그 중심 (#CCM추천 #감성노래 등)"""

new_instr = r"""        [포스팅 1: 네이버 블로그 스타일]
        ${naverPersona}
        - 제목: 클릭을 유발하는 감성적이고 호기심을 자극하는 제목
        - 본문: HTML 태그 사용, 친근한 문체, 풍부한 이모지, {{IMAGE:라벨명}} 삽입, 정보(Table) 및 인용구(Blockquote) 활용.
        - 구성: 반드시 최소 3개 이상의 챕터(서론-본론1-본론2-본론3-결론 형태)로 매우 길고 풍성하게 작성하세요. 각 챕터는 명확한 소제목과 깊이 있는 내용을 담아야 합니다. (최소 2500자 이상 권장)
        - 태그: 네이버 인기 태그 중심 (#CCM추천 #감성노래 등)"""

if old_instr in content:
    new_content = content.replace(old_instr, new_instr)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('SUCCESS')
else:
    # Try with a regex if exact match fails due to indentation/newlines
    pattern = re.escape(old_instr).replace(r'\ ', r'\s*').replace(r'\n', r'\s*')
    match = re.search(pattern, content, re.DOTALL)
    if match:
        new_content = content[:match.start()] + new_instr + content[match.end():]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('SUCCESS (REGEX)')
    else:
        print('FAILED TO FIND BLOCK')
