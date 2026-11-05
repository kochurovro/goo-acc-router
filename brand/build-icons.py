# Regenerates src/icons/*.png and brand/*.png from brand/logo.svg + brand/logo-16.svg.
# Needs: rsvg-convert (brew install librsvg), python3 + Pillow. Run: python3 brand/build-icons.py
import subprocess, re, os
from PIL import Image, ImageDraw, ImageFont
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); B=R+"/brand"; I=R+"/src/icons"
import tempfile; S=tempfile.mkdtemp()
master=open(B+"/logo.svg").read()
def svg(src,out,w,h=None):
    subprocess.check_call(["rsvg-convert","-w",str(w),"-h",str(h or w),src,"-o",out])
def variant(name, txt):
    p=f"{S}/{name}.svg"; open(p,"w").write(txt); return p
# toolbar / UI sizes
svg(B+"/logo-16.svg", I+"/16.png", 16)
svg(B+"/logo.svg", I+"/32.png", 32)
svg(B+"/logo.svg", I+"/48.png", 48)
# 128: 96 art + 16 transparent padding
pad=variant("pad128", master.replace('viewBox="0 0 96 96" width="96" height="96"','viewBox="-16 -16 128 128" width="128" height="128"'))
svg(pad, I+"/128.png", 128)
# glyph-only group (everything after the tile rect)
glyph=master.split('<rect width="96" height="96" rx="22" fill="#1f4099"/>')[1].split("</svg>")[0]
# 1024 app icon: opaque full-bleed square, Apple masks the corners
app=variant("app1024", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="1024" height="1024"><rect width="96" height="96" fill="#1f4099"/><g transform="translate(48 48) scale(0.92) translate(-48 -48)">{glyph}</g></svg>')
svg(app, S+"/app.png", 1024)
Image.open(S+"/app.png").convert("RGB").save(B+"/icon-1024.png")
# promo 440x280
promo=variant("promo", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 280" width="440" height="280">
<rect width="440" height="280" fill="#1f4099"/>
<g transform="translate(22 66) scale(1.55)">{glyph}</g>
<g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" fill="#fff">
<text x="178" y="131" font-size="40" font-weight="700" letter-spacing="-0.5">Goo Account</text>
<text x="178" y="179" font-size="40" font-weight="700" letter-spacing="-0.5">Router</text>
<rect x="179" y="198" width="44" height="6" rx="3" fill="#f97316"/>
</g></svg>''')
svg(promo, S+"/promo.png", 440, 280)
Image.open(S+"/promo.png").convert("RGB").save(B+"/promo-440x280.png")
# previews
def preview(path, bgs, ink):
    sizes=[16,32,48,128]
    W=40+sum(s+40 for s in sizes)+ (16*8+40) + (32*4+40); H=40+(len(bgs))*(128+30)+10
    out=Image.new("RGB",(W,H),bgs[0]); d=ImageDraw.Draw(out)
    y=20
    for bg in bgs:
        d.rectangle([0,y-10,W,y+128+20],fill=bg)
        x=20
        for s in sizes:
            im=Image.open(f"{I}/{s}.png").convert("RGBA")
            out.paste(im,(x,y+(128-s)//2),im); d.text((x,y+132),f"{s}px",fill=ink); x+=s+40
        for s,z in [(16,8),(32,4)]:
            im=Image.open(f"{I}/{s}.png").convert("RGBA").resize((s*z,s*z),Image.NEAREST)
            out.paste(im,(x,y),im); d.text((x,y+132),f"{s}px x{z}",fill=ink); x+=s*z+40
        y+=128+30
    out.save(path)
preview(B+"/preview-light.png",[(255,255,255),(241,243,244),(222,225,230)],(60,64,67))
preview(B+"/preview-dark.png",[(32,33,36),(53,54,58),(0,0,0)],(200,200,200))
