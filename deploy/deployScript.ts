import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { localnet } from "genlayer-js/chains";

export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), "contracts/private_p2p_contract.py");

  try {
    const contractCode = new Uint8Array(readFileSync(filePath));

    // The contract needs the two party addresses at construction time.
    // Default to the signing account itself so the demo works out of the box.
    const defaultParty = (client as any)?.account?.address ?? "";
    const partyA = process.env.PARTY_A_ADDRESS || defaultParty;
    const partyB = process.env.PARTY_B_ADDRESS || defaultParty;

    if (!partyA || !partyB) {
      throw new Error(
        "Could not determine party addresses. Set PARTY_A_ADDRESS and PARTY_B_ADDRESS or connect an account."
      );
    }

    const deployTransaction = await client.deployContract({
      code: contractCode,
      args: [partyA, partyB],
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: deployTransaction as TransactionHash,
      status: TransactionStatus.ACCEPTED,
      retries: 200,
    });

    if (
      receipt.status !== 5 &&
      receipt.status !== 6 &&
      receipt.statusName !== "ACCEPTED" &&
      receipt.statusName !== "FINALIZED"
    ) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
    }

    const deployedContractAddress =
      (client.chain as GenLayerChain).id === localnet.id
        ? receipt.data.contract_address
        : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress;

    console.log(`Contract deployed at address: ${deployedContractAddress}`);
    console.log(`Party A: ${partyA}`);
    console.log(`Party B: ${partyB}`);
  } catch (error) {
    throw new Error(`Error during deployment:, ${error}`);
  }
}