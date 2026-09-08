import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { catalog,createAsset } from './assets';

const ui=window.InteractiveEmbed;
let activeStage=null;

function disposeObject(object) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  object.traverse(node=>{
    if(node.geometry)geometries.add(node.geometry);
    const list=Array.isArray(node.material)?node.material:[node.material];
    list.filter(Boolean).forEach(m=>{materials.add(m);Object.values(m).forEach(value=>{if(value&&value.isTexture)textures.add(value);});});
  });
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());
}

function createStage(container,options={}) {
  if(!ui || !ui.onVisibility || !ui.onDispose)throw new Error('Update Interactive Embed to use managed 3D.');
  if(activeStage)throw new Error('Use one 3D stage per interactive; dispose the previous stage first.');
  if(!container || !container.isConnected)throw new Error('3D needs a connected container with an explicit CSS height.');
  const canvas=document.createElement('canvas');
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label',options.label||'Interactive 3D scene. Use the accompanying controls as a keyboard alternative.');
  canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none';
  let renderer;
  try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'}); }
  catch(error){canvas.remove();throw new Error('3D graphics are unavailable on this device. Use the 2D view.');}
  container.append(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color(options.background||0x101c30);
  const camera=new THREE.PerspectiveCamera(38,1,0.1,100);
  const initial=Array.isArray(options.camera)?options.camera:[5,2.7,8];camera.position.set(...initial);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=false;controls.autoRotate=false;controls.enablePan=false;controls.enableZoom=false;
  controls.minDistance=3;controls.maxDistance=18;controls.target.set(0,0.25,0);controls.update();
  const homeTarget=controls.target.clone();
  renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.localClippingEnabled=true;
  scene.add(new THREE.HemisphereLight(0xc2e8ff,0x3d2435,2.1));
  const key=new THREE.DirectionalLight(0xffe4d1,3);key.position.set(4,6,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x72a8ff,2.5);rim.position.set(-4,2,-3);scene.add(rim);
  let queued=0,disposed=false,draws=0,visible=ui.visible,offVisibility=()=>{},offPage=()=>{},observer=null;
  const tracked=new Set();
  function paint(){
    queued=0;if(disposed||!visible)return;
    const rect=container.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
    const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    const dpr=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(1500000/(w*h)),2048/w,2048/h);
    if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);}
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);draws++;
  }
  function render(){if(!disposed&&visible&&!queued)queued=requestAnimationFrame(paint);}
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(queued);queued=0;
    offVisibility();offPage();if(observer)observer.disconnect();window.removeEventListener('resize',render);
    canvas.removeEventListener('webglcontextlost',lost);controls.removeEventListener('change',render);controls.dispose();
    disposeObject(scene);tracked.forEach(object=>{if(!object.parent)disposeObject(object);});tracked.clear();
    renderer.dispose();renderer.forceContextLoss();canvas.remove();activeStage=null;
  }
  function lost(event){event.preventDefault();dispose();if(typeof options.onUnavailable==='function')options.onUnavailable('The graphics context was lost. Use the 2D view or restart.');}
  controls.addEventListener('change',render);canvas.addEventListener('webglcontextlost',lost);
  if(typeof ResizeObserver==='function'){observer=new ResizeObserver(render);observer.observe(container);}
  window.addEventListener('resize',render);
  offVisibility=ui.onVisibility(value=>{visible=value;if(!value){cancelAnimationFrame(queued);queued=0;}else render();});
  offPage=ui.onDispose(dispose);
  const stage=Object.freeze({
    scene,camera,controls,render,dispose,
    pick(clientX,clientY){if(disposed)return null;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;scene.updateMatrixWorld(true);const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2),camera);return ray.intersectObjects(scene.children,true).find(hit=>{let node=hit.object;while(node){if(!node.visible)return false;node=node.parent;}return true;})||null;},
    add(object){if(disposed)throw new Error('Stage has been disposed.');tracked.add(object);scene.add(object);render();return object;},
    setView(azimuth,elevation=0.25){if(disposed)return;const distance=camera.position.distanceTo(controls.target);const e=THREE.MathUtils.clamp(elevation,-1.3,1.3);camera.position.set(distance*Math.cos(e)*Math.sin(azimuth),distance*Math.sin(e),distance*Math.cos(e)*Math.cos(azimuth)).add(controls.target);controls.update();render();},
    zoom(factor){if(disposed||!Number.isFinite(factor)||factor<=0)return;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,3,18));camera.position.copy(controls.target).add(offset);controls.update();render();},
    resetCamera(){if(disposed)return;camera.position.set(...initial);controls.target.copy(homeTarget);controls.update();render();},
    stats(){return {draws,disposed,width:canvas.width,height:canvas.height,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,triangles:renderer.info.render.triangles};}
  });
  activeStage=stage;render();return stage;
}

window.InteractiveEmbed3D=Object.freeze({version:1,engineRevision:THREE.REVISION,THREE,createStage,createAsset,catalog});
