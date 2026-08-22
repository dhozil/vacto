/**
 * Local registry of contracts you deployed from this browser.
 * Solves "forgot to copy the address": every deployment is remembered here
 * together with its purpose, so it can be reloaded from the UI later.
 */
import { safeJsonGet, safeJsonSet, safeStorage } from "../utils/safeStorage";

export interface DeployedContract {
  address: string;
  purpose: string;
  links: string[];
  deployedAt: string;
}

const KEY = "p2p_my_contracts";
const MAX = 25;

export function addDeployedContract(record: DeployedContract): void {
  const list = safeJsonGet<DeployedContract[]>(KEY, []);
  const clean = record.address.trim().toLowerCase();
  const filtered = list.filter((r) => r.address.toLowerCase() !== clean);
  const updated = [record, ...filtered].slice(0, MAX);
  safeJsonSet(KEY, updated);
}

export function getDeployedContracts(): DeployedContract[] {
  return safeJsonGet<DeployedContract[]>(KEY, []);
}

export function removeDeployedContract(address: string): void {
  const clean = address.trim().toLowerCase();
  safeJsonSet(
    KEY,
    getDeployedContracts().filter((r) => r.address.toLowerCase() !== clean)
  );
}

export function clearDeployedContracts(): void {
  safeStorage.remove(KEY);
}

export default {
  addDeployedContract,
  getDeployedContracts,
  removeDeployedContract,
  clearDeployedContracts,
};