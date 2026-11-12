/* Linked labels, photo-space object contours and a masked spotlight on selection. */
(() => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const ns = 'http://www.w3.org/2000/svg';
  const resetters = [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let maskCount = 0;
  const node = (name, attrs = {}) => {
    const el = document.createElementNS(ns, name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  };
  const xy = point => point.map(v => Number(v.toFixed(3))).join(' ');
  const outlinePath = (points, shape) => {
    const count = points.length;
    if (shape === 'cup' || shape === 'badge') {
      // Short cubic tangents keep the handle and rim curved without ballooning the outline.
      let path = `M ${xy(points[0])}`;
      for (let i = 0; i < count; i++) {
        const a=points[(i+count-1)%count],b=points[i],c=points[(i+1)%count],d=points[(i+2)%count];
        const c1=[b[0]+(c[0]-a[0])*.105,b[1]+(c[1]-a[1])*.105];
        const c2=[c[0]-(d[0]-b[0])*.105,c[1]-(d[1]-b[1])*.105];
        path+=` C ${xy(c1)} ${xy(c2)} ${xy(c)}`;
      }
      return path+' Z';
    }
    // Paper keeps its straight edges; only the very corners are softened.
    const radius = shape === 'paper' ? 1.3 : shape === 'pen' ? 0.8 : 3;
    const corners=points.map((p,i)=>{
      const prev=points[(i+count-1)%count],next=points[(i+1)%count];
      const before=Math.hypot(prev[0]-p[0],prev[1]-p[1]),after=Math.hypot(next[0]-p[0],next[1]-p[1]);
      const r=Math.min(radius,before*.2,after*.2);
      return {point:p,in:[p[0]+(prev[0]-p[0])*r/(before||1),p[1]+(prev[1]-p[1])*r/(before||1)],out:[p[0]+(next[0]-p[0])*r/(after||1),p[1]+(next[1]-p[1])*r/(after||1)]};
    });
    let path=`M ${xy(corners[0].out)}`;
    for(let i=1;i<=count;i++){
      const corner=corners[i%count];
      path+=` L ${xy(corner.in)} Q ${xy(corner.point)} ${xy(corner.out)}`;
    }
    return path+' Z';
  };
  const connectionEnd = (path, start, top) => {
    const length=path.getTotalLength();
    const score=p=>top?p.y:(p.x-start[0])**2+(p.y-start[1])**2;
    let best=0,bestScore=Infinity;
    for(let i=0;i<=32;i++){
      const at=length*i/32,value=score(path.getPointAtLength(at));
      if(value<bestScore){bestScore=value;best=at;}
    }
    const center=best;
    for(let i=-8;i<=8;i++){
      const at=clamp(center+length*i/256,0,length),value=score(path.getPointAtLength(at));
      if(value<bestScore){bestScore=value;best=at;}
    }
    const point=path.getPointAtLength(best);
    return [point.x,point.y,length ? best / length : 0];
  };
  const runSequence = group => {
    group.animations?.forEach(animation => animation.cancel());
    group.animations = [];
    const stagger = 30, lineDuration = 360, outlineDuration = 420, pause = 45;
    const lastDelay = (group.parts.length - 1) * stagger;
    const outlineStart = group.reverse ? 0 : lineDuration + lastDelay + pause;
    const lineStart = group.reverse ? outlineDuration + lastDelay + pause : 0;
    group.parts.forEach(({contour,reveal},index) => {
      contour.style.strokeDasharray = reduceMotion ? '1 0' : '0 1';
      reveal.style.strokeDashoffset = reduceMotion ? '0' : '1';
      if (reduceMotion) return;
      const options = {fill:'both',easing:'cubic-bezier(.4,0,.2,1)'};
      group.animations.push(
        reveal.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{
          ...options,duration:lineDuration,delay:lineStart + index * stagger
        }),
        contour.animate([{strokeDasharray:'0 1'},{strokeDasharray:'1 0'}],{
          ...options,duration:outlineDuration,delay:outlineStart + index * stagger
        })
      );
    });
    group.playDirection = !!group.reverse;
    group.playing = true;
  };
  document.querySelectorAll('.shot').forEach(shot => {
    const frame = shot.querySelector('.ph'), image = frame?.querySelector('img');
    if (!image) return;
    const spots = [...shot.querySelectorAll('.hotspot')];
    const groups = new Map();
    let selected = null;
    spots.forEach(spot => {
      const fallback = {x:Number(spot.dataset.photoX),y:Number(spot.dataset.photoY),w:Number(spot.dataset.boxW),h:Number(spot.dataset.boxH)};
      const targets = spot.dataset.targets ? JSON.parse(spot.dataset.targets) : [fallback];
      const maskId = `merch-mask-${++maskCount}`;
      const shade = node('svg', {class:'hotspot__spotlight', 'aria-hidden':'true'});
      const svg = node('svg', {class:'hotspot__connections', 'aria-hidden':'true'});
      const lineDefs = node('defs');
      svg.appendChild(lineDefs);
      const defs = node('defs');
      const mask = node('mask', {id:maskId,maskUnits:'userSpaceOnUse','mask-type':'luminance'});
      const base = node('rect', {class:'spotlight-base',x:0,y:0,width:'100%',height:'100%'});
      mask.appendChild(base);defs.appendChild(mask);
      shade.append(defs,node('rect',{class:'spotlight-dim',x:0,y:0,width:'100%',height:'100%',mask:`url(#${maskId})`}));
      const parts = targets.map((target, index) => {
        const lineMaskId = `${maskId}-line-${index}`;
        const lineMask = node('mask',{id:lineMaskId,maskUnits:'userSpaceOnUse','mask-type':'luminance',x:0,y:0,width:'100%',height:'100%'});
        const reveal = node('path',{class:'connection-reveal',pathLength:1});
        lineMask.appendChild(reveal);lineDefs.appendChild(lineMask);
        const line = node('path',{class:'connection-line'});
        line.setAttribute('mask',`url(#${lineMaskId})`);
        const contour = node('path',{class:'object-contour',pathLength:1});
        [reveal,line,contour].forEach(el=>el.style.setProperty('--target-order',index));
        const cutout = node('path',{class:'spotlight-cutout'});
        svg.append(line,contour);mask.appendChild(cutout);
        return {target,line,contour,cutout,reveal};
      });
      frame.append(shade,svg);groups.set(spot,{shade,svg,parts});
    });
    const position = () => {
      const width=frame.clientWidth,height=frame.clientHeight;
      if (!image.naturalWidth || !width || !height) return;
      const fr=frame.getBoundingClientRect(),ir=image.getBoundingClientRect();
      const scale=Math.max(ir.width/image.naturalWidth,ir.height/image.naturalHeight);
      const dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
      const op=getComputedStyle(image).objectPosition.split(' ').map(v=>parseFloat(v)/100);
      const project=([x,y])=>[ir.left-fr.left+x*dw-(dw-ir.width)*op[0],ir.top-fr.top+y*dh-(dh-ir.height)*op[1]];
      spots.forEach(spot=>{
        const [x,y]=project([Number(spot.dataset.photoX),Number(spot.dataset.photoY)]);
        spot.style.setProperty('--x',x+'px');spot.style.setProperty('--y',y+'px');
        const tw=Math.min(180,innerWidth-64);
        spot.style.setProperty('--tip-left',(clamp(x-tw/2,8,width-tw-8)-x+22)+'px');
        const group=groups.get(spot),tag=shot.querySelector(`[data-pin="${spot.id}"]`);
        [group.shade,group.svg].forEach(svg=>svg.setAttribute('viewBox',`0 0 ${width} ${height}`));
        const tr=tag?.getBoundingClientRect();
        const start=tr?[tr.left+tr.width/2-fr.left,tr.top-fr.top]:[x,y];
        group.parts.forEach(({target,line,contour,cutout,reveal})=>{
          const outline=target.outline || Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return [target.x+Math.cos(a)*target.w/2,target.y+Math.sin(a)*target.h/2]});
          const points=outline.map(project);
          const d=outlinePath(points,target.shape||'rounded');
          contour.setAttribute('d',d);cutout.setAttribute('d',d);
          const end=connectionEnd(contour,start,target.route==='arch');
          // Start the outline exactly where the connection meets the object.
          contour.style.strokeDashoffset = String(-end[2]);
          let connection=group.reverse
            ? `M ${end[0]} ${end[1]} L ${start[0]} ${start[1]}`
            : `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`;
          if(target.route==='arch'){
            const dx=end[0]-start[0];
            const rise=clamp(Math.abs(dx)*.45,48,140);
            const c1=[start[0]+dx*.12,Math.max(12,start[1]-rise)];
            const c2=[end[0]-dx*.2,Math.max(12,end[1]-rise)];
            connection=group.reverse
              ? `M ${end[0]} ${end[1]} C ${c2[0]} ${c2[1]} ${c1[0]} ${c1[1]} ${start[0]} ${start[1]}`
              : `M ${start[0]} ${start[1]} C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${end[0]} ${end[1]}`;
          }
          line.setAttribute('d',connection);reveal.setAttribute('d',connection);
        });
      });
    };
    const paint = () => {
      if (!selected?.classList.contains('is-linked')) selected=spots.find(s=>s.classList.contains('is-linked'))||null;
      shot.querySelector('.shot__visual')?.classList.toggle('is-inspecting',!!selected);
      if(selected)position();
      groups.forEach((group,spot)=>{
        const active = spot === selected;
        [group.svg,group.shade].forEach(el=>el.classList.toggle('is-linked',active));
        if(active && (!group.playing || group.playDirection !== !!group.reverse))runSequence(group);
        if(!active)group.playing = false;
      });
    };
    image.addEventListener('load',position);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(position).observe(frame);
    window.addEventListener('resize',position);document.fonts?.ready.then(position);position();
    spots.forEach(spot=>{
      const tag=shot.querySelector(`[data-pin="${spot.id}"]`);
      let hovered=false,focused=false,pinned=false;
      const sync=()=>{
        const active=pinned||hovered||focused;
        spot.classList.toggle('is-linked',active);tag?.classList.toggle('is-linked',active);
        spot.classList.toggle('is-active',pinned);spot.setAttribute('aria-expanded',String(active));
        if(active)selected=spot;paint();
      };
      resetters.push(()=>{pinned=false;sync();});
      const group=groups.get(spot);
      const setDirection=control=>{
        const reverse=control!==tag;
        group.reverse=reverse;
        group.svg.dataset.direction=reverse?'to-label':'to-object';
      };
      [spot,tag,...group.parts.map(part=>part.contour)].filter(Boolean).forEach(control=>{
        control.addEventListener('mouseenter',()=>{setDirection(control);hovered=true;sync();});
        control.addEventListener('mouseleave',()=>{hovered=false;sync();});
        control.addEventListener('focus',()=>{setDirection(control);focused=true;sync();});
        control.addEventListener('blur',()=>{focused=false;sync();});
        control.addEventListener('click',event=>{event.stopPropagation();setDirection(control);const next=!pinned;resetters.forEach(reset=>reset());pinned=next;sync();});
      });
    });
  });
  document.addEventListener('click',()=>resetters.forEach(reset=>reset()));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')resetters.forEach(reset=>reset());});
})();
