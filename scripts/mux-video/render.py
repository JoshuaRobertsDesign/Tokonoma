import subprocess, os, sys
exec(open('scenes.py').read())
ENC = ['-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-r','30','-g','60','-an']
def chain(i):
    k,f,s,t,g = SCENES[i]
    tail = ',setsar=1,format=yuv420p' if k=='e' else ','+BASE
    return g + tail + ',fps=30,settb=1/30'
n=len(SCENES); files=[]
for i in range(n):
    k,f,s,t,g = SCENES[i]
    lead = X if i>0 else 0.0
    dur = L - lead
    args=['ffmpeg','-v','error','-y','-ss',f'{s+lead:.3f}','-t',f'{dur+0.5:.3f}','-i',f]
    fc = f'[0:v]{chain(i)},trim=duration={dur:.3f},setpts=PTS-STARTPTS[a]'
    out='[a]'
    if i < n-1:
        k2,f2,s2,t2,g2 = SCENES[i+1]
        args += ['-ss',f'{s2:.3f}','-t',f'{X+0.5:.3f}','-i',f2]
        fc += f';[1:v]{chain(i+1)},trim=duration={X:.3f},setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration={X}:offset={dur-X:.3f},trim=duration={dur:.3f}[x]'
        out='[x]'
    if i == 0:
        fc += f';{out}fade=t=in:st=0:d=1.5[y]'; out='[y]'
    if i == n-1:
        fc += f';{out}fade=t=out:st={dur-2.5:.3f}:d=2.5[y]'; out='[y]'
    tmp=f'build/scene{i}.tmp.mp4'; final=f'build/scene{i}.mp4'
    subprocess.run(args+['-filter_complex',fc,'-map',out]+ENC+[tmp],check=True)
    os.replace(tmp,final); files.append(final)
    d=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',final],capture_output=True,text=True).stdout.strip()
    print(i,t,'expected',dur,'got',d,flush=True)
open('build/list.txt','w').write(''.join(f"file '{os.path.basename(p)}'\n" for p in files))
