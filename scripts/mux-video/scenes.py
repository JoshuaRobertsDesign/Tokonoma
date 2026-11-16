U='/mnt/user-data/uploads/'; A='/mnt/user-data/attachments/e1709e19-4ef2-53ab-8296-99ec372e2b02/'
# key, file, start (s), title, per-clip grade
SCENES = [
  ('f', A+'5f173560-4288027-hd_1920_1080_24fps.mp4', 3.0,  'Daybreak',              'framerate=fps=30,eq=saturation=0.95:contrast=1.03'),
  ('d', U+'6587124-hd_1920_1080_25fps.mp4',          20.0, 'Plum blossom',          'framerate=fps=30,eq=saturation=0.9:contrast=1.0:brightness=-0.01'),
  ('a', U+'16128428_1920_1080_30fps.mp4',            30.0, 'Temple in bloom',       'fps=30,eq=saturation=0.88:contrast=1.02:brightness=-0.01'),
  ('b', U+'16911462-hd_1920_1080_60fps.mp4',         28.0, 'Koi under the falls', 'fps=30,eq=saturation=0.92:contrast=1.02'),
  ('c', U+'16990331_1920_1080_30fps.mp4',            62.0, 'A robin’s bath',        'fps=30,eq=saturation=0.95'),
  ('e', U+'7593530-uhd_2732_1318_30fps.mp4',         0.0, 'Tea by the window',     'fps=30,scale=-2:1080:flags=lanczos,crop=1920:1080,eq=contrast=1.2:saturation=0.88:gamma=0.86:brightness=-0.03'),
  ('g', U+'12728008_1920_1080_30fps.mp4',            10.0, 'Autumn maple',          'fps=30,eq=saturation=0.88:contrast=1.02'),
]
SCENES[6] = ('g', A+'f660f286-12728008_1920_1080_30fps.mp4') + SCENES[6][2:]
L, X = 14.0, 1.5          # each scene's span incl. its outgoing crossfade; crossfade length
BASE = 'scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p'
