"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import PrivateP2PContract from "../contracts/PrivateP2PContract";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import type { FeePresetLevel } from "../genlayer/fees";
import { useWallet } from "../genlayer/wallet";
import { success, error } from "../utils/toast";
import type { P2PState } from "../contracts/types";

/**
 * Memoized contract instance, recreated whenever the wallet address changes.
 * Pass an explicit address to override the one from .env (typed in the UI).
 */
export function usePrivateP2PContract(overrideAddress?: string) {
  const { address } = useWallet();
  const contractAddress = overrideAddress?.trim() || getContractAddress();
  const studioUrl = getStudioUrl();

  return useMemo(() => {
    if (!contractAddress) return null;
    return new PrivateP2PContract(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);
}

function useInvalidateState() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["p2pState"] });
}

export function useContractState(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);

  return useQuery<P2PState | null, Error>({
    queryKey: ["p2pState", overrideAddress?.trim() || getContractAddress()],
    queryFn: async () => {
      if (!contract) return null;
      return contract.getState();
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useAmIParty(state?: P2PState | null, address?: string | null) {
  if (!state || !address) return null;
  const a = address.toLowerCase();
  if (state.party_a?.toLowerCase() === a) return "A";
  if (state.party_b?.toLowerCase() === a) return "B";
  return null;
}

export function useCommitTerms(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isCommitting, setIsCommitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      commit,
      feeLevel = "standard" as FeePresetLevel,
    }: {
      commit: string;
      feeLevel?: FeePresetLevel;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsCommitting(true);
      return contract.commitTerms(commit, feeLevel);
    },
    onSuccess: () => {
      invalidate();
      setIsCommitting(false);
      success("Commit recorded", {
        description: "Your hash commitment is now on-chain.",
      });
    },
    onError: (err: any) => {
      console.error("Commit error:", err);
      setIsCommitting(false);
      error("Commit failed", { description: err?.message || "Please try again." });
    },
  });

  return { ...mutation, isCommitting, commitTerms: mutation.mutateAsync };
}

export function useResetCommits(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isResetting, setIsResetting] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsResetting(true);
      return contract.resetCommits();
    },
    onSuccess: () => {
      invalidate();
      setIsResetting(false);
      success("Reset consent recorded", {
        description:
          "A full reset requires BOTH parties to call reset. Your consent is recorded.",
      });
    },
    onError: (err: any) => {
      console.error("Reset error:", err);
      setIsResetting(false);
      error("Reset failed", { description: err?.message || "Please try again." });
    },
  });

  return { ...mutation, isResetting, resetCommits: mutation.mutateAsync };
}

export function useRetractCommit(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isRetracting, setIsRetracting] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRetracting(true);
      return contract.retractCommit();
    },
    onSuccess: () => {
      invalidate();
      setIsRetracting(false);
      success("Commit retracted", {
        description: "Your own commitment was withdrawn.",
      });
    },
    onError: (err: any) => {
      console.error("Retract error:", err);
      setIsRetracting(false);
      error("Failed to retract commit", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isRetracting, retractCommit: mutation.mutateAsync };
}

export function useRequestCompletion(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isApproving, setIsApproving] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsApproving(true);
      return contract.requestCompletion();
    },
    onSuccess: () => {
      invalidate();
      setIsApproving(false);
      success("Completion approved", {
        description:
          "Your approval is recorded. The contract closes once BOTH parties approve.",
      });
    },
    onError: (err: any) => {
      console.error("Complete error:", err);
      setIsApproving(false);
      error("Failed to approve completion", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isApproving,
    requestCompletion: mutation.mutateAsync,
  };
}

export function useRetractCompletion(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isRetracting, setIsRetracting] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRetracting(true);
      return contract.retractCompletion();
    },
    onSuccess: () => {
      invalidate();
      setIsRetracting(false);
      success("Approval withdrawn");
    },
    onError: (err: any) => {
      console.error("Retract completion error:", err);
      setIsRetracting(false);
      error("Failed to withdraw approval", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isRetracting,
    retractCompletion: mutation.mutateAsync,
  };
}

export function useRequestDispute(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isRequesting, setIsRequesting] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRequesting(true);
      return contract.requestDispute();
    },
    onSuccess: () => {
      invalidate();
      setIsRequesting(false);
      success("Dispute requested", {
        description: "Completion is now locked until the dispute is resolved.",
      });
    },
    onError: (err: any) => {
      console.error("Request dispute error:", err);
      setIsRequesting(false);
      error("Failed to request dispute", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isRequesting, requestDispute: mutation.mutateAsync };
}

export function useWithdrawDisputeRequest(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsWithdrawing(true);
      return contract.withdrawDisputeRequest();
    },
    onSuccess: () => {
      invalidate();
      setIsWithdrawing(false);
      success("Dispute request withdrawn", {
        description: "Private completion is unlocked again.",
      });
    },
    onError: (err: any) => {
      console.error("Withdraw dispute error:", err);
      setIsWithdrawing(false);
      error("Failed to withdraw dispute request", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isWithdrawing,
    withdrawDisputeRequest: mutation.mutateAsync,
  };
}

export function useOpenDispute(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isOpening, setIsOpening] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      terms,
      salt,
    }: {
      terms: string;
      salt: string;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsOpening(true);
      return contract.openDispute(terms, salt);
    },
    onSuccess: () => {
      invalidate();
      setIsOpening(false);
      success("Dispute opened", {
        description: "The terms have been revealed on-chain.",
      });
    },
    onError: (err: any) => {
      console.error("Dispute error:", err);
      setIsOpening(false);
      error("Failed to open dispute", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isOpening, openDispute: mutation.mutateAsync };
}

export function useSubmitStatement(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ statement }: { statement: string }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsSubmitting(true);
      return contract.submitStatement(statement);
    },
    onSuccess: () => {
      invalidate();
      setIsSubmitting(false);
      success("Statement submitted");
    },
    onError: (err: any) => {
      console.error("Statement error:", err);
      setIsSubmitting(false);
      error("Failed to submit statement", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isSubmitting, submitStatement: mutation.mutateAsync };
}

export function useResolveDispute(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isResolving, setIsResolving] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsResolving(true);
      return contract.resolveDispute();
    },
    onSuccess: () => {
      invalidate();
      setIsResolving(false);
      success("Dispute resolved", {
        description: "The AI jury reached a verdict on-chain.",
      });
    },
    onError: (err: any) => {
      console.error("Resolve error:", err);
      setIsResolving(false);
      error("Failed to resolve dispute", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isResolving, resolveDispute: mutation.mutateAsync };
}

export function useForceCompletion(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isForcing, setIsForcing] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsForcing(true);
      return contract.forceCompletion();
    },
    onSuccess: () => {
      invalidate();
      setIsForcing(false);
      success("Contract closed", {
        description:
          "Response window elapsed; the contract was closed privately.",
      });
    },
    onError: (err: any) => {
      console.error("Force completion error:", err);
      setIsForcing(false);
      error("Force completion failed", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isForcing, forceCompletion: mutation.mutateAsync };
}

export function useForceResolveDispute(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isForcing, setIsForcing] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsForcing(true);
      return contract.forceResolveDispute();
    },
    onSuccess: () => {
      invalidate();
      setIsForcing(false);
      success("Dispute resolved", {
        description:
          "Resolution deadline passed; the dispute was force-resolved.",
      });
    },
    onError: (err: any) => {
      console.error("Force resolve error:", err);
      setIsForcing(false);
      error("Force resolve failed", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isForcing, forceResolveDispute: mutation.mutateAsync };
}

export function useCommitClauses(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isRecording, setIsRecording] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      clauseHashes,
    }: {
      clauseHashes: string[];
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRecording(true);
      return contract.commitClauses([...clauseHashes]);
    },
    onSuccess: () => {
      invalidate();
      setIsRecording(false);
      success("Clause commitments recorded", {
        description:
          "Both parties must record identical digests to enable partial reveal.",
      });
    },
    onError: (err: any) => {
      console.error("Commit clauses error:", err);
      setIsRecording(false);
      error("Failed to record clause commitments", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isRecording, commitClauses: mutation.mutateAsync };
}

export function useRevealClause(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isRevealing, setIsRevealing] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      index,
      clauseText,
      salt,
    }: {
      index: number;
      clauseText: string;
      salt: string;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRevealing(true);
      return contract.revealClause(index, clauseText, salt);
    },
    onSuccess: () => {
      invalidate();
      setIsRevealing(false);
      success("Clause proven", {
        description:
          "The clause was verified against the commitments and published.",
      });
    },
    onError: (err: any) => {
      console.error("Reveal clause error:", err);
      setIsRevealing(false);
      error("Could not reveal clause", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return { ...mutation, isRevealing, revealClause: mutation.mutateAsync };
}

export function useRequestClarification(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isRequesting, setIsRequesting] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsRequesting(true);
      return contract.requestClarification();
    },
    onSuccess: () => {
      invalidate();
      setIsRequesting(false);
      success("Clarification requested", {
        description:
          "Your nudge has been recorded on-chain. The counterparty can now revise their statement.",
      });
    },
    onError: (err: any) => {
      console.error("Request clarification error:", err);
      setIsRequesting(false);
      error("Failed to request clarification", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isRequesting,
    requestClarification: mutation.mutateAsync,
  };
}

export function useSubmitEvidence(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      urls,
      feeLevel = "standard" as FeePresetLevel,
    }: {
      urls: string[];
      feeLevel?: FeePresetLevel;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsSubmittingEvidence(true);
      return contract.submitEvidence(urls, feeLevel);
    },
    onSuccess: () => {
      invalidate();
      setIsSubmittingEvidence(false);
      success("Evidence recorded", {
        description:
          "Your evidence URLs are bound to your party on-chain and will be fetched during arbitration.",
      });
    },
    onError: (err: any) => {
      console.error("Submit evidence error:", err);
      setIsSubmittingEvidence(false);
      error("Failed to submit evidence", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isSubmittingEvidence,
    submitEvidence: mutation.mutateAsync,
  };
}

export function useCommitIdentity(overrideAddress?: string) {
  const contract = usePrivateP2PContract(overrideAddress);
  const { address } = useWallet();
  const invalidate = useInvalidateState();
  const [isCommittingIdentity, setIsCommittingIdentity] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      termsSha256,
      saltSha256,
      feeLevel = "standard" as FeePresetLevel,
    }: {
      termsSha256: string;
      saltSha256: string;
      feeLevel?: FeePresetLevel;
    }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Wallet not connected.");
      setIsCommittingIdentity(true);
      return contract.commitIdentity(termsSha256, saltSha256, feeLevel);
    },
    onSuccess: () => {
      invalidate();
      setIsCommittingIdentity(false);
      success("Identity committed", {
        description:
          "Public sha256 commitments for the terms and salt are now recorded on-chain — immutable for dispute verification.",
      });
    },
    onError: (err: any) => {
      console.error("Commit identity error:", err);
      setIsCommittingIdentity(false);
      error("Failed to commit identity", {
        description: err?.message || "Please try again.",
      });
    },
  });

  return {
    ...mutation,
    isCommittingIdentity,
    commitIdentity: mutation.mutateAsync,
  };
}