"""Chọn & chuyển nhạc / tiếng từ bộ Ninja Adventure (CC0) vào game.
Chạy: python3 tools/make_audio.py   (cần macOS — dùng afconvert có sẵn)

  public/assets/audio/music/<tên>.m4a   nhạc nền (AAC 80kbps, tải dần khi cần)
  public/assets/audio/amb/<tên>.wav     tiếng môi trường lặp (mono 22kHz, lặp không bị hở)
  public/assets/audio/sfx/<key>_<i>.wav tiếng hiệu ứng, mỗi key nhiều biến thể (mono 44kHz)
Danh sách key phải khớp SFX_DEF trong src/audio.js.
"""
import os, shutil, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NJ = os.path.join(os.path.dirname(ROOT), 'ninja', 'Ninja Adventure - Asset Pack', 'Audio')
OUT = os.path.join(ROOT, 'public', 'assets', 'audio')

MUSIC = {
    'peaceful': '5 - Peaceful', 'chill': '27 - Chill', 'calm_village': '33 - Calm Village',
    'dream': '22 - Dream', 'melancholia': '16 - Melancholia', 'lament': '29 - Lament',
    'lost_village': '26 - Lost Village', 'village': '36 - Village',
    'dark_forest': '37 - Dark Forest', 'clearing': '11 - Clearing',
    'ruins': '30 - Ruins', 'tension': '28 - Tension', 'road': '23 - Road',
    'cave': '2 - The Cave', 'dungeon': '21 - Dungeon',
    'fight': '17 - Fight',
    'good_time': '20 - Good Time', 'sunny': '31 - Sunny', 'adventure': '35 - Adventure', 'boat': '39 - Boat',
}
AMB = {'wind': 'Sounds/Ambient/Wind', 'rain': 'Sounds/Ambient/Rain2', 'river': 'Sounds/Ambient/River'}

S = 'Sounds/'
SFX = {
    'click': ['Menu/Move1', 'Menu/Move3'],
    'open': ['Menu/Menu5'],
    'close': ['Menu/Menu6'],
    'cancel': ['Menu/Cancel2'],
    'success': ['Menu/Accept3', 'Menu/Accept6'],
    'coin': ['Bonus/Coin', 'Bonus/Coin2', 'Bonus/Coin3'],
    'harvest': ['Bonus/Bonus2', 'Bonus/Bonus3'],
    'plant': ['Elemental/Grass2'],
    'grass': ['Elemental/Grass', 'Elemental/Grass2'],
    'hoe': ['Hit & Impact/Impact3', 'Hit & Impact/Impact5'],
    'chop': ['Hit & Impact/Hit1', 'Hit & Impact/Hit3'],
    'pick': ['Hit & Impact/Hit5', 'Hit & Impact/Hit6'],
    'water': ['Elemental/Water1', 'Elemental/Water4'],
    'splash': ['Elemental/Water10', 'Elemental/Water9'],
    'talk': ['Voice/Voice1', 'Voice/Voice2', 'Voice/Voice5', 'Voice/Voice8'],
    'hurt': ['Hit & Impact/Hit9', 'Hit & Impact/Hit2'],
    'swing': ['Whoosh & Slash/Whoosh', 'Whoosh & Slash/Whoosh2', 'Whoosh & Slash/Slash'],
    'monster': ['Hit & Impact/Impact', 'Hit & Impact/Impact2', 'Hit & Impact/Impact4'],
    'zdie': ['Hit & Impact/Hit7', 'Hit & Impact/Hit8'],
    'boom': ['Elemental/Explosion2'],
    'shot': ['Elemental/Explosion3'],
    'shotgun': ['Elemental/Explosion'],
    'empty': ['Menu/Move2'],
    'groan': ['Voice/Voice3', 'Voice/Voice6', 'Voice/Voice7', 'Voice/Voice9'],
    'alert': ['Alert/Alert2'],
    'ladder': ['Jump & Bounce/Jump'],
    'door': ['Menu/Move5'],
    'heal': ['Magic & Skill/Heal2'],
    'eat': ['Jump & Bounce/Bounce4'],
    'bird': ['Creature/Bird'],
    'dog': ['Creature/Dog'],
    'fire': ['Elemental/Fire', 'Elemental/Fire3'],
    'levelup': ['../Jingles/LevelUp1'],
    'fanfare': ['../Jingles/Success2'],
    'secret': ['../Jingles/Secret2'],
    'gameover': ['../Jingles/GameOver2'],
}
# Giữ lại từ bản cũ (không có trong bộ Ninja)
KEEP = {'animal': 'animal.wav', 'search': 'search.wav'}


def conv(src, dst, args):
    subprocess.run(['afconvert', *args, src, dst], check=True)


def main():
    sfx_dir = os.path.join(OUT, 'sfx')
    for d in ('music', 'amb'):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    # Giữ file cũ cần dùng, xoá phần còn lại
    kept = {}
    for k, f in KEEP.items():
        p = os.path.join(sfx_dir, f)
        if os.path.exists(p):
            kept[k] = open(p, 'rb').read()
    shutil.rmtree(sfx_dir, ignore_errors=True)
    os.makedirs(sfx_dir)
    for k, data in kept.items():
        open(os.path.join(sfx_dir, f'{k}_0.wav'), 'wb').write(data)

    for key, files in SFX.items():
        for i, f in enumerate(files):
            conv(os.path.join(NJ, S, f + '.wav'), os.path.join(sfx_dir, f'{key}_{i}.wav'), ['-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1'])
    for key, f in AMB.items():
        conv(os.path.join(NJ, f + '.wav'), os.path.join(OUT, 'amb', key + '.wav'), ['-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1'])
    for key, f in MUSIC.items():
        dst = os.path.join(OUT, 'music', key + '.m4a')
        if not os.path.exists(dst):
            conv(os.path.join(NJ, 'Musics', f + '.ogg'), dst, ['-f', 'm4af', '-d', 'aac', '-b', '80000'])
    print('sfx', sum(len(v) for v in SFX.values()), 'music', len(MUSIC), 'amb', len(AMB))


if __name__ == '__main__':
    main()
