/**
 * TypeScript wrapper around the PrivateP2PContract intelligent contract.
 */
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { P2PState, TransactionReceipt } from "./types";
import {
  estimateWriteFeePreset,
  feePresetToTransactionFees,
  type FeePresetEstimate,
  type FeePresetLevel,
} from "../genlayer/fees";
import { logTransaction } from "./txLog";

class PrivateP2PContract {
  private contractAddress: `0x${string}`;
  private client: any;
  private studioUrl?: string;

  constructor(
    contractAddress: string,
    address?: string | null,
    studioUrl?: string
  ) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.studioUrl = studioUrl;

    const config: any = {
      chain: studionet,
    };
    if (address) {
      config.account = address as `0x${string}`;
    }
    if (studioUrl) {
      config.endpoint = studioUrl;
    }
    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const config: any = {
      chain: studionet,
      account: address as `0x${string}`,
    };
    if (this.studioUrl) {
      config.endpoint = this.studioUrl;
    }
    this.client = createClient(config);
  }

  private async write(
    functionName: string,
    args: unknown[],
    feePreset?: FeePresetEstimate
  ): Promise<TransactionReceipt> {
    const fees = feePresetToTransactionFees(feePreset);
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName,
      args,
      value: BigInt(0),
      ...(fees ? { fees } : {}),
    });

    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 24,
      interval: 5000,
    });

    // Audit trail: record every successful on-chain action locally.
    try {
      logTransaction(this.contractAddress, {
        hash: String(txHash ?? receipt?.hash ?? ""),
        functionName,
        status: String(receipt?.status ?? "ACCEPTED"),
        blockNumber: receipt?.blockNumber,
      });
    } catch {
      // logging must never break the tx flow
    }

    return receipt as TransactionReceipt;
  }

  private async estimateFees(
    functionName: string,
    args: unknown[],
    level: FeePresetLevel
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(
      this.client,
      {
        address: this.contractAddress,
        functionName,
        args,
      },
      level
    );
  }

  // ------------------------------------------------------------------ views

  async getState(): Promise<P2PState | null> {
    try {
      const state: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_state",
        args: [],
      });
      if (!state) return null;
      return state as P2PState;
    } catch (error) {
      console.error("Error fetching contract state:", error);
      return null;
    }
  }

  // ------------------------------------------------------------------ writes

  async commitTerms(
    commit: string,
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("commit_terms", [commit], feeLevel);
    return this.write("commit_terms", [commit], feePreset);
  }

  async resetCommits(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("reset_commits", [], feeLevel);
    return this.write("reset_commits", [], feePreset);
  }

  async retractCommit(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("retract_commit", [], feeLevel);
    return this.write("retract_commit", [], feePreset);
  }

  async requestCompletion(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("request_completion", [], feeLevel);
    return this.write("request_completion", [], feePreset);
  }

  async retractCompletion(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("retract_completion", [], feeLevel);
    return this.write("retract_completion", [], feePreset);
  }

  async requestDispute(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("request_dispute", [], feeLevel);
    return this.write("request_dispute", [], feePreset);
  }

  async withdrawDisputeRequest(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees(
      "withdraw_dispute_request",
      [],
      feeLevel
    );
    return this.write("withdraw_dispute_request", [], feePreset);
  }

  async openDispute(
    terms: string,
    salt: string,
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("open_dispute", [terms, salt], feeLevel);
    return this.write("open_dispute", [terms, salt], feePreset);
  }

  async submitStatement(
    statement: string,
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("submit_statement", [statement], feeLevel);
    return this.write("submit_statement", [statement], feePreset);
  }

  async resolveDispute(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("resolve_dispute", [], feeLevel);
    return this.write("resolve_dispute", [], feePreset);
  }

  async forceCompletion(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("force_completion", [], feeLevel);
    return this.write("force_completion", [], feePreset);
  }

  async forceResolveDispute(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees(
      "force_resolve_dispute",
      [],
      feeLevel
    );
    return this.write("force_resolve_dispute", [], feePreset);
  }

  async commitClauses(
    clauseHashes: string[],
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees("commit_clauses", [clauseHashes], feeLevel);
    return this.write("commit_clauses", [clauseHashes], feePreset);
  }

  async revealClause(
    index: number,
    clauseText: string,
    salt: string,
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees(
      "reveal_clause",
      [index, clauseText, salt],
      feeLevel
    );
    return this.write("reveal_clause", [index, clauseText, salt], feePreset);
  }

  async requestClarification(
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees(
      "request_clarification",
      [],
      feeLevel
    );
    return this.write("request_clarification", [], feePreset);
  }

  async submitEvidence(
    urls: string[],
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees(
      "submit_evidence",
      [urls],
      feeLevel
    );
    return this.write("submit_evidence", [urls], feePreset);
  }

  async commitIdentity(
    termsSha256: string,
    saltSha256: string,
    feeLevel: FeePresetLevel = "standard"
  ): Promise<TransactionReceipt> {
    const feePreset = await this.estimateFees(
      "commit_identity",
      [termsSha256, saltSha256],
      feeLevel
    );
    return this.write("commit_identity", [termsSha256, saltSha256], feePreset);
  }
}

export default PrivateP2PContract;