import { mkdir, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { createSessionAuth } from "./security/session-auth.js";
const U=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,M=4*1024*1024;
const R={travel:["businessName","legalName","licenseNumber","directorName","email","phone","city","address"],vendor:["businessName","legalName","businessType","businessEmail","picName","picPhone","picEmail","address","city","country"]};const D={travel:["business","license","identity"],vendor:["business","tax","identity"]};
const mime=b=>b.subarray(0,5).toString()==="%PDF-"?"application/pdf":b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?"image/png":b.subarray(0,3).equals(Buffer.from([255,216,255]))?"image/jpeg":null;const out=r=>({id:r.id,applicationType:r.application_type,status:r.status,payload:r.payload,submittedAt:r.submitted_at,createdAt:r.created_at,updatedAt:r.updated_at});
export async function registerPartnerRegistrationDraftRoutes(app,pool){const value=process.env.SEGALOKA_PRIVATE_STORAGE_ROOT;if(!value||!isAbsolute(value))throw Error("SEGALOKA_PRIVATE_STORAGE_ROOT_INVALID");const root=resolve(value);await mkdir(root,{recursive:true});const baseAuth=createSessionAuth(pool);const auth=async(req,rep)=>{await baseAuth(req,rep);if(rep.sent)return false;const q=await pool.query("SELECT 1 FROM public.memberships m JOIN public.roles r ON r.id=m.role_id WHERE m.user_id=$1 AND r.code='traveler'",[req.auth.userId]);if(!q.rowCount){rep.code(403).send({code:"TRAVELER_ACCOUNT_REQUIRED"});return false;}return true;};const get=async(c,id,user,lock="")=>(await c.query(`SELECT * FROM public.partner_registration_applications WHERE id=$1 AND user_id=$2 ${lock}`,[id,user])).rows[0];
app.post("/registration/applications/draft",{preHandler:auth},async(req,rep)=>{const b=req.body||{};if(!R[b.applicationType]||!b.payload)return rep.code(400).send({code:"INVALID_APPLICATION"});const q=await pool.query("SELECT id FROM public.partner_registration_applications WHERE user_id=$1 AND application_type=$2 AND status IN ('draft','submitted','under_review','revision_required')",[req.auth.userId,b.applicationType]);if(q.rowCount)return rep.code(409).send({code:"APPLICATION_EXISTS",id:q.rows[0].id});const x=await pool.query("INSERT INTO public.partner_registration_applications(application_type,user_id,payload,status) VALUES($1,$2,$3,'draft') RETURNING *",[b.applicationType,req.auth.userId,JSON.stringify(b.payload)]);return rep.code(201).send(out(x.rows[0]));});
app.patch("/registration/applications/:id",{preHandler:auth},async(req,rep)=>{const c=await pool.connect();try{await c.query("BEGIN");const a=await get(c,req.params.id,req.auth.userId,"FOR UPDATE");if(!a||!["draft","revision_required"].includes(a.status)){await c.query("ROLLBACK");return rep.code(a?409:404).send({code:a?"APPLICATION_NOT_EDITABLE":"APPLICATION_NOT_FOUND"});}const x=await c.query("UPDATE public.partner_registration_applications SET payload=$1,updated_at=now() WHERE id=$2 RETURNING *",[JSON.stringify(req.body?.payload||{}),a.id]);await c.query("COMMIT");return rep.send(out(x.rows[0]));}catch{await c.query("ROLLBACK");return rep.code(500).send({code:"APPLICATION_UPDATE_FAILED"});}finally{c.release();}});
app.post("/registration/applications/:id/submit",{preHandler:auth},async(req,rep)=>{const c=await pool.connect();try{await c.query("BEGIN");const a=await get(c,req.params.id,req.auth.userId,"FOR UPDATE");if(!a){await c.query("ROLLBACK");return rep.code(404).send({code:"APPLICATION_NOT_FOUND"});}if(a.status==="submitted"||a.status==="under_review"){await c.query("ROLLBACK");return rep.send(out(a));}if(!["draft","revision_required"].includes(a.status)){await c.query("ROLLBACK");return rep.code(409).send({code:"APPLICATION_NOT_SUBMITTABLE"});}if(!R[a.application_type].every(k=>typeof a.payload?.[k]==="string"&&a.payload[k].trim())){await c.query("ROLLBACK");return rep.code(422).send({code:"REQUIRED_FIELDS_MISSING"});}const loc=a.payload||{};
const uuid=v=>typeof v==="string"&&U.test(v);
if(!uuid(loc.countryId)||!uuid(loc.cityId)||(loc.provinceId&&!uuid(loc.provinceId))){
  await c.query("ROLLBACK");
  return rep.code(422).send({code:"INVALID_LOCATION_ID"});
}
const cq=await c.query("SELECT id,iso2,name FROM public.master_countries WHERE id=$1 AND is_active=true",[loc.countryId]);
if(!cq.rowCount||cq.rows[0].name!==loc.country){
  await c.query("ROLLBACK");
  return rep.code(422).send({code:"INVALID_COUNTRY"});
}
const country=cq.rows[0];
const rq=await c.query("SELECT id,name FROM public.master_regions WHERE country_id=$1 AND is_active=true",[country.id]);
const hasRegions=rq.rowCount>0;
if(hasRegions){
  if(!uuid(loc.provinceId)||!rq.rows.some(r=>r.id===loc.provinceId&&r.name===loc.province)){
    await c.query("ROLLBACK");
    return rep.code(422).send({code:"INVALID_PROVINCE"});
  }
}else if(loc.provinceId||loc.province){
  await c.query("ROLLBACK");
  return rep.code(422).send({code:"UNEXPECTED_PROVINCE"});
}
const cityQuery=country.iso2==="ID"
  ? "SELECT id,name FROM public.master_id_regencies WHERE id=$1 AND province_id=$2 AND is_active=true"
  : hasRegions
    ? "SELECT id,name FROM public.master_cities WHERE id=$1 AND region_id=$2 AND country_id=$3 AND is_active=true"
    : "SELECT id,name FROM public.master_cities WHERE id=$1 AND country_id=$2 AND region_id IS NULL AND is_active=true";
const cityArgs=country.iso2==="ID"
  ? [loc.cityId,loc.provinceId]
  : hasRegions
    ? [loc.cityId,loc.provinceId,country.id]
    : [loc.cityId,country.id];
const cityResult=await c.query(cityQuery,cityArgs);
if(!cityResult.rowCount||cityResult.rows[0].name!==loc.city){
  await c.query("ROLLBACK");
  return rep.code(422).send({code:"INVALID_CITY"});
}
const d=await c.query("SELECT document_type FROM public.registration_documents WHERE application_id=$1",[a.id]);const have=new Set(d.rows.map(x=>x.document_type));if(D[a.application_type].some(x=>!have.has(x))){await c.query("ROLLBACK");return rep.code(422).send({code:"REQUIRED_DOCUMENTS_MISSING"});}const x=await c.query("UPDATE public.partner_registration_applications SET status='submitted',submitted_at=now(),updated_at=now() WHERE id=$1 AND status IN ('draft','revision_required') RETURNING *",[a.id]);await c.query("INSERT INTO public.partner_registration_events(application_id,actor_user_id,from_status,to_status) VALUES($1,$2,$3,'submitted')",[a.id,req.auth.userId,a.status]);await c.query("COMMIT");return rep.send(out(x.rows[0]));}catch{await c.query("ROLLBACK");return rep.code(500).send({code:"APPLICATION_SUBMIT_FAILED"});}finally{c.release();}});
app.post("/registration/documents/draft",{preHandler:auth,bodyLimit:Math.ceil(M/3)*4+8192},async(req,rep)=>{const b=req.body||{};if(!U.test(b.applicationId)||typeof b.contentBase64!=="string")return rep.code(400).send({code:"INVALID_DOCUMENT"});const buf=Buffer.from(b.contentBase64.replace(/^data:[^;]+;base64,/ ,""),"base64"),m=mime(buf);if(!m||!buf.length||buf.length>M)return rep.code(400).send({code:"INVALID_DOCUMENT_CONTENT"});const c=await pool.connect();let key;try{await c.query("BEGIN");const a=await get(c,b.applicationId,req.auth.userId,"FOR UPDATE");if(!a||!["draft","revision_required"].includes(a.status)){await c.query("ROLLBACK");return rep.code(a?409:404).send({code:a?"APPLICATION_NOT_EDITABLE":"APPLICATION_NOT_FOUND"});}if(!D[a.application_type]?.includes(b.documentType)){await c.query("ROLLBACK");return rep.code(400).send({code:"INVALID_DOCUMENT_TYPE"});}key=`${req.auth.userId}/${randomBytes(24).toString("hex")}`;const p=resolve(root,key);if(!p.startsWith(root+sep))throw Error("PATH");await mkdir(join(p,".."),{recursive:true});await writeFile(p,buf,{flag:"wx"});const x=await c.query("INSERT INTO public.registration_documents(application_id,user_id,document_type,storage_key,original_name,mime_type,byte_size) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",[a.id,req.auth.userId,b.documentType,key,b.originalName||"document",m,buf.length]);await c.query("COMMIT");return rep.code(201).send({documentId:x.rows[0].id});}catch{await c.query("ROLLBACK");if(key)await unlink(resolve(root,key)).catch(()=>{});return rep.code(500).send({code:"DOCUMENT_UPLOAD_FAILED"});}finally{c.release();}});}
