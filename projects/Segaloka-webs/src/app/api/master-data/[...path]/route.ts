import { NextResponse } from "next/server";
import { segalokaApiRequest } from "@/lib/api/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(_:Request,{params}:{params:Promise<{path:string[]}>}){try{const {path}=await params;const data=await segalokaApiRequest(`/master-data/${path.map(encodeURIComponent).join("/")}`);return NextResponse.json(data,{headers:{"cache-control":"no-store"}});}catch(error){return NextResponse.json({code:error instanceof Error?error.message:"MASTER_DATA_UNAVAILABLE"},{status:503});}}
