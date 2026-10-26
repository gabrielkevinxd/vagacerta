import { api } from "@/server/http";
import { reconciliarOfsc } from "@/server/ofsc/cliente";

export const POST = api(async () => reconciliarOfsc());
