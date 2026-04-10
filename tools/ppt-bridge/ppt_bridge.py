"""
ppt_bridge.py — HTTP bridge to PowerPoint COM automation.
Runs on localhost:9876. Accepts POST /exec with JSON {"code": "..."} body.
The code executes in a persistent namespace with `ppt` (Application) and
`pres` (active Presentation) pre-loaded. Set `_result` in code to return
structured data.

Usage:
  python ppt_bridge.py              # launch PPT, new blank deck
  python ppt_bridge.py open <path>  # open existing .pptx

API:
  POST /exec        {"code": "python code"}  → {"output","result","error"}
  GET  /status      → {"slides": N, "file": "...", "width": ..., "height": ...}
  GET  /screenshot/N → PNG image (exported at 2× slide dimensions)
  GET  /shapes/N    → [{"index","id","name","type","left","top","width","height","text",...}]
  GET  /slides      → [{"index": 1, "name": "...", "shapes": N}, ...]
  POST /save        {"path": "..."} → save presentation (optional path for SaveAs)
  POST /reset       → reinitialize namespace (keep ppt/pres, reset helpers)
"""

import http.server, json, traceback, sys, io, os, tempfile, base64, re, math, time
from datetime import datetime
import win32com.client

PORT = 9876
S = 0.5  # 1920px canvas → 960pt slide
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bridge_logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, f'session_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jsonl')

# ── COM constants ──
msoHorizontal = 1
msoRect = 1
msoConnStraight = 1
msoTrue = -1
msoFalse = 0
ppAlignLeft = 1
ppAlignCenter = 2
ppAlignRight = 3
ppAnchorTop = 1
ppAnchorMiddle = 3
ppAnchorBottom = 4
ppAutoSizeNone = 0
ppLayoutBlank = 12

def rgb(r, g, b):
    return r + g * 256 + b * 65536

def pt(px):
    return px * S

# ── PowerPoint launch ──

def launch_ppt():
    """Launch or reconnect to PowerPoint."""
    app = win32com.client.Dispatch('PowerPoint.Application')
    app.Visible = msoTrue
    return app

def log_exec(code, output, result, error):
    """Append exec call to session log for audit/replay."""
    entry = {
        'ts': datetime.now().isoformat(),
        'code': code,
        'output': output[:500] if output else None,
        'error': error[:500] if error else None,
        'has_result': result is not None,
    }
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry) + '\n')
    except Exception:
        pass  # don't let logging break the bridge

ppt = launch_ppt()

if len(sys.argv) > 2 and sys.argv[1] == 'open':
    pres = ppt.Presentations.Open(os.path.abspath(sys.argv[2]))
    print(f'Opened: {sys.argv[2]} ({pres.Slides.Count} slides)')
else:
    pres = ppt.Presentations.Add()
    pres.PageSetup.SlideWidth = 960
    pres.PageSetup.SlideHeight = 540
    print('New presentation (960×540 pt = 13.333×7.5 in)')


# ── Shared namespace for /exec ──
# Everything in here is available to code sent via POST /exec

ns = {
    'ppt': ppt,
    'pres': pres,
    'S': S,
    'pt': pt,
    'rgb': rgb,
    'os': os,
    'json': json,
    're': re,
    'math': math,
    'time': time,
    'msoHorizontal': msoHorizontal,
    'msoRect': msoRect,
    'msoConnStraight': msoConnStraight,
    'msoTrue': msoTrue,
    'msoFalse': msoFalse,
    'ppAlignLeft': ppAlignLeft,
    'ppAlignCenter': ppAlignCenter,
    'ppAlignRight': ppAlignRight,
    'ppAnchorTop': ppAnchorTop,
    'ppAnchorMiddle': ppAnchorMiddle,
    'ppAnchorBottom': ppAnchorBottom,
    'ppAutoSizeNone': ppAutoSizeNone,
    'ppLayoutBlank': ppLayoutBlank,
    'FONT': 'Josefin Sans',
    'IMAGES': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images'),
    'SCREENSHOTS': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'screenshots'),
}


# ── Helper functions injected into namespace ──

exec('''
def add_text(sl, text, x, y, w, h, size=28, color=rgb(0x11,0x11,0x11), bold=False,
             weight=300, align=ppAlignLeft, anchor=ppAnchorTop,
             line_height=1.5, spacing_em=0, uppercase=False, name=None):
    tb = sl.Shapes.AddTextbox(msoHorizontal, pt(x), pt(y), pt(w), pt(h))
    tf = tb.TextFrame
    tf.WordWrap = msoTrue
    tf.AutoSize = ppAutoSizeNone
    tf.VerticalAnchor = anchor
    tf.MarginLeft = 0; tf.MarginRight = 0; tf.MarginTop = 0; tf.MarginBottom = 0
    txt = text.upper() if uppercase else text
    lines = txt.split(chr(10))
    for i, line in enumerate(lines):
        if i == 0:
            tf.TextRange.Text = line
        else:
            tf.TextRange.InsertAfter(chr(13) + line)
    tr = tf.TextRange
    # Font weight -> name mapping
    font_name = "Josefin Sans Light" if weight <= 300 else FONT
    tr.Font.Name = font_name
    tr.Font.Size = pt(size)
    tr.Font.Color.RGB = color
    tr.Font.Bold = bold or weight >= 700
    # Letter spacing via TextFrame2 (supports negative values too)
    if spacing_em != 0:
        tf2 = tb.TextFrame2
        tf2.TextRange.Font.Spacing = spacing_em * pt(size)
    # Line spacing: proportional mode, per-paragraph
    # PPT "single spacing" (1.0) ~ CSS line-height 1.2
    ppt_spacing = line_height / 1.2
    for p in range(1, tr.Paragraphs().Count + 1):
        pf = tr.Paragraphs(p).ParagraphFormat
        pf.LineRuleWithin = -1  # msoTrue = proportional mode
        pf.SpaceWithin = ppt_spacing
        pf.SpaceBefore = 0
        pf.SpaceAfter = 0
    tr.ParagraphFormat.Alignment = align
    tb.Line.Visible = msoFalse
    # Set dimensions AFTER text ops (PPT auto-shrinks textboxes)
    tb.Width = pt(w)
    tb.Height = pt(h)
    tb.Left = pt(x)
    tb.Top = pt(y)
    if name:
        tb.Name = name
    return tb

def add_rect(sl, x, y, w, h, fill_color, alpha=1.0, name=None):
    sh = sl.Shapes.AddShape(msoRect, pt(x), pt(y), pt(w), pt(h))
    sh.Fill.Solid()
    sh.Fill.ForeColor.RGB = fill_color
    if alpha < 1.0:
        sh.Fill.Transparency = 1.0 - alpha
    sh.Line.Visible = msoFalse
    if name:
        sh.Name = name
    return sh

def add_image(sl, filename, x, y, w, h, name=None):
    path = os.path.join(IMAGES, filename) if not os.path.isabs(filename) else filename
    if not os.path.exists(path):
        raise FileNotFoundError(f"Image not found: {path}")
    sh = sl.Shapes.AddPicture(path, msoFalse, msoTrue, pt(x), pt(y), pt(w), pt(h))
    if name:
        sh.Name = name
    return sh

def add_bar(sl, x, y, color, w=3, h=24, name=None):
    return add_rect(sl, x, y, w, h, color, name=name)

def add_rule(sl, x, y, color, w=60, h=2, name=None):
    return add_rect(sl, x, y, w, h, color, name=name)

def add_label(sl, text, x, y, accent, text_color=rgb(0x88,0x88,0x88)):
    add_bar(sl, x, y, accent)
    add_text(sl, text.upper(), x+13, y-2, 600, 28, size=22,
             color=text_color, line_height=1.0, spacing_em=0.15)

def add_slidenum(sl, num, dark=True):
    c = rgb(0x73,0x73,0x73) if dark else rgb(0x6E,0x6E,0x73)
    add_text(sl, num, 1750, 1040, 50, 30, size=20, color=c,
             align=ppAlignRight, line_height=1.0, spacing_em=0.1)

def add_image_bg(sl, filename, scrim_alpha=0.35):
    add_image(sl, filename, 0, 0, 1920, 1080)
    # scrim: CSS alpha -> PPT transparency is inverted
    scrim = add_rect(sl, 0, 0, 1920, 1080, rgb(0,0,0))
    scrim.Fill.Transparency = 1.0 - scrim_alpha

def add_line(sl, x1, y1, x2, y2, color, width=1.5):
    cn = sl.Shapes.AddConnector(msoConnStraight, pt(x1), pt(y1), pt(x2), pt(y2))
    cn.Line.ForeColor.RGB = color
    cn.Line.Weight = width * S
    return cn

def add_node(sl, label, x, y, color, w=195, h=44, name=None):
    r = add_rect(sl, x, y, w, h, color, name=name)
    add_text(sl, label, x, y, w, h, size=18, color=rgb(255,255,255),
             align=ppAlignCenter, anchor=ppAnchorMiddle,
             line_height=1.0, spacing_em=0.08)
    return r

def set_bg(sl, color):
    sl.FollowMasterBackground = msoFalse
    sl.Background.Fill.Solid()
    sl.Background.Fill.ForeColor.RGB = color

def set_notes(sl, text):
    try:
        sl.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text = text
    except Exception:
        # Fallback: find notes placeholder by iterating
        for i in range(1, sl.NotesPage.Shapes.Count + 1):
            sh = sl.NotesPage.Shapes(i)
            if sh.HasTextFrame and sh.PlaceholderFormat.Type == 2:
                sh.TextFrame.TextRange.Text = text
                return

def new_slide(bg_color=rgb(0x0F,0x11,0x13), index=None):
    n = index if index else pres.Slides.Count + 1
    sl = pres.Slides.Add(n, ppLayoutBlank)
    set_bg(sl, bg_color)
    return sl

def safe_slide(n):
    count = pres.Slides.Count
    if n < 1 or n > count:
        raise ValueError(f"Slide {n} does not exist. Valid range: 1-{count}")
    return pres.Slides(n)

def find_shape(sl, name):
    for i in range(1, sl.Shapes.Count + 1):
        if sl.Shapes(i).Name == name:
            return sl.Shapes(i)
    raise ValueError(f"Shape '{name}' not found on slide")

def delete_shape(sl, name_or_index):
    if isinstance(name_or_index, str):
        find_shape(sl, name_or_index).Delete()
    else:
        sl.Shapes(name_or_index).Delete()

def get_shapes(slide_num):
    sl = safe_slide(slide_num)
    result = []
    for i in range(1, sl.Shapes.Count + 1):
        sh = sl.Shapes(i)
        info = {
            'index': i, 'id': sh.Id, 'name': sh.Name, 'type': sh.Type,
            'left': round(sh.Left, 1), 'top': round(sh.Top, 1),
            'width': round(sh.Width, 1), 'height': round(sh.Height, 1),
        }
        if sh.HasTextFrame:
            try:
                info['text'] = sh.TextFrame.TextRange.Text
                info['font'] = sh.TextFrame.TextRange.Font.Name
                info['font_size'] = sh.TextFrame.TextRange.Font.Size
                info['font_color'] = sh.TextFrame.TextRange.Font.Color.RGB
                info['bold'] = bool(sh.TextFrame.TextRange.Font.Bold)
                info['alignment'] = sh.TextFrame.TextRange.ParagraphFormat.Alignment
            except Exception:
                pass
        try:
            if sh.Type == 1:  # msoAutoShape
                info['fill_color'] = sh.Fill.ForeColor.RGB
                info['fill_transparency'] = sh.Fill.Transparency
        except Exception:
            pass
        result.append(info)
    return result
''', ns)


# ── HTTP Handler ──

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress request logging

    def _json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def _check_ppt(self):
        """Verify PowerPoint is still alive. Attempt reconnect if not."""
        global ppt, pres
        try:
            _ = pres.Slides.Count
            return True
        except Exception:
            # Try to reconnect
            try:
                ppt = launch_ppt()
                if ppt.Presentations.Count > 0:
                    pres = ppt.ActivePresentation
                    ns['ppt'] = ppt
                    ns['pres'] = pres
                    return True
            except Exception:
                pass
            self._json(503, {'error': 'PowerPoint is disconnected. Restart the bridge.'})
            return False

    def do_GET(self):
        if not self._check_ppt():
            return

        if self.path == '/status':
            try:
                self._json(200, {
                    'slides': pres.Slides.Count,
                    'file': pres.FullName if pres.FullName else None,
                    'width': pres.PageSetup.SlideWidth,
                    'height': pres.PageSetup.SlideHeight,
                })
            except Exception as e:
                self._json(500, {'error': str(e)})

        elif self.path == '/slides':
            try:
                slides = []
                for i in range(1, pres.Slides.Count + 1):
                    sl = pres.Slides(i)
                    slides.append({
                        'index': i,
                        'name': sl.Name,
                        'shapes': sl.Shapes.Count,
                    })
                self._json(200, slides)
            except Exception as e:
                self._json(500, {'error': str(e)})

        elif self.path.startswith('/screenshot/'):
            try:
                n = int(self.path.split('/')[-1])
                count = pres.Slides.Count
                if n < 1 or n > count:
                    self._json(400, {'error': f'Slide {n} does not exist. Valid: 1-{count}'})
                    return
                # Export at 2x slide dimensions for quality
                w = int(pres.PageSetup.SlideWidth * 2)
                h = int(pres.PageSetup.SlideHeight * 2)
                tmp = tempfile.mktemp(suffix='.png', prefix=f'ppt_slide_{n}_')
                try:
                    pres.Slides(n).Export(tmp, 'PNG', w, h)
                    with open(tmp, 'rb') as f:
                        data = f.read()
                finally:
                    if os.path.exists(tmp):
                        os.remove(tmp)
                self.send_response(200)
                self.send_header('Content-Type', 'image/png')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                self._json(500, {'error': str(e)})

        elif self.path.startswith('/shapes/'):
            try:
                n = int(self.path.split('/')[-1])
                shapes = ns['get_shapes'](n)
                self._json(200, shapes)
            except Exception as e:
                self._json(500, {'error': str(e)})

        else:
            self._json(404, {'error': 'Not found. Endpoints: /status, /slides, /screenshot/N, /shapes/N, POST /exec /save /reset'})

    def do_POST(self):
        if not self._check_ppt():
            return

        content_length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(content_length) if content_length else b''

        if self.path == '/exec':
            try:
                body = json.loads(raw) if raw else {}
            except json.JSONDecodeError as e:
                self._json(400, {'error': f'Invalid JSON: {e}'})
                return
            code = body.get('code', '')

            old_stdout = sys.stdout
            sys.stdout = captured = io.StringIO()
            ns.pop('_result', None)

            try:
                exec(code, ns)
                output = captured.getvalue()
                result = ns.pop('_result', None)
                log_exec(code, output, result, None)
                self._json(200, {'output': output, 'result': result, 'error': None})
            except Exception:
                sys.stdout = old_stdout
                err = traceback.format_exc()
                log_exec(code, captured.getvalue(), None, err)
                self._json(200, {'output': captured.getvalue(), 'result': None, 'error': err})
            finally:
                sys.stdout = old_stdout

        elif self.path == '/save':
            try:
                body = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                body = {}
            try:
                path = body.get('path')
                if path:
                    pres.SaveAs(os.path.abspath(path))
                    self._json(200, {'saved': os.path.abspath(path)})
                else:
                    pres.Save()
                    self._json(200, {'saved': pres.FullName})
            except Exception as e:
                self._json(500, {'error': str(e)})

        elif self.path == '/reset':
            # Re-execute helper definitions to reset namespace
            try:
                # Keep core refs, clear user vars
                keep = {'ppt','pres','S','pt','rgb','os','json','re','math','time',
                        'msoHorizontal','msoRect','msoConnStraight','msoTrue','msoFalse',
                        'ppAlignLeft','ppAlignCenter','ppAlignRight',
                        'ppAnchorTop','ppAnchorMiddle','ppAnchorBottom',
                        'ppAutoSizeNone','ppLayoutBlank','FONT','IMAGES','SCREENSHOTS'}
                to_del = [k for k in ns if k not in keep and not k.startswith('__')]
                for k in to_del:
                    del ns[k]
                self._json(200, {'reset': True, 'cleared': len(to_del)})
            except Exception as e:
                self._json(500, {'error': str(e)})

        elif self.path == '/undo':
            try:
                pres.Application.CommandBars.ExecuteMso("Undo")
                self._json(200, {'undo': True})
            except Exception as e:
                self._json(500, {'error': str(e)})

        elif self.path == '/redo':
            try:
                pres.Application.CommandBars.ExecuteMso("Redo")
                self._json(200, {'redo': True})
            except Exception as e:
                self._json(500, {'error': str(e)})

        else:
            self._json(404, {'error': 'POST to /exec, /save, /reset, /undo, or /redo'})


# ── Start server ──

server = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
print(f'\nPPT Bridge listening on http://localhost:{PORT}')
print(f'  GET  /status         — slide count, file info')
print(f'  GET  /slides         — list all slides')
print(f'  GET  /screenshot/N   — PNG of slide N')
print(f'  GET  /shapes/N       — JSON shape list for slide N')
print(f'  POST /exec           — run Python in COM context')
print(f'  POST /save           — save presentation')
print(f'  POST /reset          — reset namespace')
print(f'  POST /undo           — undo last action')
print(f'  POST /redo           — redo last undo')
print(f'\nExec log: {LOG_FILE}')
print(f'PowerPoint is visible. Bridge is ready.')
print('-' * 40)

try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\nShutting down...')
    server.shutdown()
