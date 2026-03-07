/**
 * Qibla direction calculator
 */
export const KAABA_LAT = 21.42016389;
export const KAABA_LNG = 39.82233056;
const WGS84_A = 6378137.0;
const WGS84_B = 6356752.314245;
const WGS84_F = 1 / 298.257223563;
function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }
export function getQiblaBearing(lat, lng) {
  const phi1=toRad(lat),phi2=toRad(KAABA_LAT),L=toRad(KAABA_LNG-lng);
  const U1=Math.atan((1-WGS84_F)*Math.tan(phi1)),U2=Math.atan((1-WGS84_F)*Math.tan(phi2));
  const sU1=Math.sin(U1),cU1=Math.cos(U1),sU2=Math.sin(U2),cU2=Math.cos(U2);
  let lam=L,lp=0,ss=0,cs=0,sig=0,sa=0,c2a=0,c2sm=0,it=0;
  do {
    const sl=Math.sin(lam),cl=Math.cos(lam);
    const a=cU2*sl,b=cU1*sU2-sU1*cU2*cl;
    ss=Math.sqrt(a*a+b*b);cs=sU1*sU2+cU1*cU2*cl;
    sig=Math.atan2(ss,cs);sa=ss===0?0:(cU1*cU2*sl)/ss;
    c2a=1-sa*sa;c2sm=c2a===0?0:cs-(2*sU1*sU2)/c2a;
    const C=(WGS84_F/16)*c2a*(4+WGS84_F*(4-3*c2a));lp=lam;
    lam=L+(1-C)*WGS84_F*sa*(sig+C*ss*(c2sm+C*cs*(-1+2*c2sm*c2sm)));it++;
  } while(Math.abs(lam-lp)>1e-12&&it<100);
  if(it>=100){const dL=toRad(KAABA_LNG-lng);const y=Math.sin(dL)*Math.cos(toRad(KAABA_LAT));const x=Math.cos(toRad(lat))*Math.sin(toRad(KAABA_LAT))-Math.sin(toRad(lat))*Math.cos(toRad(KAABA_LAT))*Math.cos(dL);return(toDeg(Math.atan2(y,x))+360)%360;}
  const sl=Math.sin(lam),cl=Math.cos(lam);
  const a1=Math.atan2(cU2*sl,cU1*sU2-sU1*cU2*cl);
  return(toDeg(a1)+360)%360;
}
export function getDistanceToMecca(lat, lng) {
  const phi1=toRad(lat),phi2=toRad(KAABA_LAT),L=toRad(KAABA_LNG-lng);
  const U1=Math.atan((1-WGS84_F)*Math.tan(phi1)),U2=Math.atan((1-WGS84_F)*Math.tan(phi2));
  const sU1=Math.sin(U1),cU1=Math.cos(U1),sU2=Math.sin(U2),cU2=Math.cos(U2);
  let lam=L,lp=0,ss=0,cs=0,sig=0,sa=0,c2a=0,c2sm=0,it=0;
  do {
    const sl=Math.sin(lam),cl=Math.cos(lam);
    const a=cU2*sl,b=cU1*sU2-sU1*cU2*cl;
    ss=Math.sqrt(a*a+b*b);if(ss===0)return 0;
    cs=sU1*sU2+cU1*cU2*cl;sig=Math.atan2(ss,cs);
    sa=(cU1*cU2*sl)/ss;c2a=1-sa*sa;
    c2sm=c2a===0?0:cs-(2*sU1*sU2)/c2a;
    const C=(WGS84_F/16)*c2a*(4+WGS84_F*(4-3*c2a));lp=lam;
    lam=L+(1-C)*WGS84_F*sa*(sig+C*ss*(c2sm+C*cs*(-1+2*c2sm*c2sm)));it++;
  } while(Math.abs(lam-lp)>1e-12&&it<100);
  const uSq=c2a*(WGS84_A*WGS84_A-WGS84_B*WGS84_B)/(WGS84_B*WGS84_B);
  const A=1+uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
  const B=uSq/1024*(256+uSq*(-128+uSq*(74-47*uSq)));
  const ds=B*ss*(c2sm+B/4*(cs*(-1+2*c2sm*c2sm)-B/6*c2sm*(-3+4*ss*ss)*(-3+4*c2sm*c2sm)));
  return(WGS84_B*A*(sig-ds))/1000;
}
/**
 * Compute the lat/lng of the point you'd reach travelling from (lat,lng)
 * at the given bearing (degrees) for distKm kilometres (spherical earth).
 * When bearing === qiblaBearing, the result converges on the Kaaba.
 */
export function getDestinationPoint(lat: number, lng: number, bearingDeg: number, distKm: number): { lat: number; lng: number } {
  const R = 6371;
  const d = distKm / R;
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const br  = toRad(bearingDeg);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(br)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(br) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: toDeg(lat2), lng: ((toDeg(lng2) + 540) % 360) - 180 };
}

export function formatDistance(km, lang) {
  if(km<1000) return Math.round(km)+' km';
  return (km/1000).toFixed(1)+'k km';
}