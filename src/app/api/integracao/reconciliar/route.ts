import { apiCentral } from "@/server/http";
import { reconciliarOfsc } from "@/server/ofsc/cliente";

export const POST = apiCentral(async () => reconciliarOfsc());
