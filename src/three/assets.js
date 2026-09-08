import * as THREE from 'three';

// Original procedural teaching assets. No external models, textures or anatomy scans.
// Asset IDs are versioned so saved snippets retain a stable contract.
export const catalog = Object.freeze([
  Object.freeze({id:'heart-chambers-v1',name:'Stylized four-chamber heart',kind:'procedural',accuracy:'Spatial teaching abstraction; not anatomically or physiologically validated.'}),
  Object.freeze({id:'vessel-cutaway-v1',name:'Vessel cross-section',kind:'procedural',accuracy:'Cylindrical teaching abstraction; no flow/pressure solver.'})
]);

function material(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({color,roughness:0.3,metalness:0.05,clearcoat:0.5,...extra});
}
function tube(points,radius,color) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve,40,radius,12,false),material(color));
}
export function createAsset(id) {
  const object = new THREE.Group();
  object.name = id;
  if(id==='heart-chambers-v1') {
    const shells = new THREE.Group(),blood = new THREE.Group(),vessels = new THREE.Group();
    object.add(shells,blood,vessels);
    const parts = {shells,blood,vessels};
    const geometry = new THREE.SphereGeometry(1,32,24);
    const chambers = [
      ['rightAtrium',[-1.05,0.85,0],[0.72,0.78,0.67],0x438bc2],
      ['rightVentricle',[-0.65,-0.6,0.12],[0.82,1.12,0.75],0x397bbd],
      ['leftAtrium',[0.85,1,-0.18],[0.65,0.65,0.6],0xe77498],
      ['leftVentricle',[0.83,-0.63,0],[0.77,1.27,0.76],0xd93b68]
    ];
    chambers.forEach(([name,position,size,color]) => {
      const wall = new THREE.Mesh(geometry,material(0xbc6c7c,{transparent:true,opacity:0.42,depthWrite:false}));
      wall.name = name+'Wall';wall.position.set(...position);wall.scale.set(...size);shells.add(wall);
      const cavity = new THREE.Mesh(geometry,material(color));
      cavity.name = name;cavity.position.set(...position);cavity.scale.set(...size.map(v=>v*0.73));
      cavity.userData.baseScale = cavity.scale.toArray();blood.add(cavity);parts[name]=cavity;
    });
    parts.aorta=tube([[0.65,0.4,-0.25],[0.35,1.8,-0.3],[0.6,2.4,-0.35],[1.5,2.25,-0.4],[1.9,1.3,-0.55]],0.22,0xd9778c);
    parts.pulmonaryArtery=tube([[-0.55,0.1,0.3],[-0.3,1.6,0.4],[0,1.92,0.55],[-1.25,2.1,0.65]],0.19,0x73accc);
    vessels.add(parts.aorta,parts.pulmonaryArtery);
    vessels.add(tube([[-1.1,0.8,0],[-1.2,1.7,0],[-1.25,2.3,0]],0.18,0x5188bb));
    vessels.add(tube([[0.9,1,-0.3],[1.6,1.1,-0.5],[2,1.3,-0.65]],0.14,0xdd90a4));
    return {object,parts,setCutaway(value){shells.visible=!value;},setFilling(fraction){
      // Encodes relative volume by cube-root linear scale, not a physiological law.
      const f=Math.max(0.15,Math.min(1,Number.isFinite(fraction)?fraction:1));
      Object.values(parts).filter(p=>p.userData.baseScale).forEach(p=>p.scale.fromArray(p.userData.baseScale).multiplyScalar(Math.cbrt(f)));
    }};
  }
  if(id==='vessel-cutaway-v1') {
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,3,48,1,true,0,Math.PI*1.55),material(0xd58b9c,{side:THREE.DoubleSide}));
    const lumen=new THREE.Mesh(new THREE.CylinderGeometry(0.67,0.67,2.95,32),material(0x9d284e));
    wall.rotation.z=lumen.rotation.z=Math.PI/2;object.add(wall,lumen);
    return {object,parts:{wall,lumen},setRadius(fraction){const r=Math.max(.1,Math.min(.95,Number.isFinite(fraction)?fraction:.67));lumen.scale.x=lumen.scale.z=r/.67;}};
  }
  throw new Error('Unknown bundled 3D asset: '+id);
}
