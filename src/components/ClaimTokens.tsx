// src/component/TransferERC20.tsx
import React, { useEffect, useState } from 'react'
import { Button, NumberInput,  NumberInputField,  FormControl, InputGroup, Text, InputRightAddon } from '@chakra-ui/react'
import {ethers} from 'ethers'
import {formatEther, parseEther} from 'ethers/lib/utils'
import { PeerFedABI as peerFedABI } from 'abi/PeerFedABI'
import { TransactionResponse,TransactionReceipt } from "@ethersproject/abstract-provider"

interface Props {
    peerFedContract: string,
    currentAccount: string | undefined,
    token0Symbol: string,
    token1Symbol: string,
    gasSymbol: string,
}

declare let window: any;

export default function ClaimTokens(props:Props) {
  const peerFedContract = props.peerFedContract;
  const currentAccount = props.currentAccount;
  const token0Symbol = props.token0Symbol;
  const token1Symbol = props.token1Symbol;
  const gasSymbol = props.gasSymbol;

  const [bidAmount,setBidAmount]=useState<string>('0');
  const [mintableToken0,setMintableToken0]=useState<number>(0);
  const [mintableToken1,setMintableToken1]=useState<number>(0);
  const [currentBid,setCurrentBid]=useState<number>(0);
  const [currentBidder,setCurrentBidder]=useState<string>('N/A');

  const [nextMintDate,setNextMintDate]=useState<Date>(new Date(0))
  const [isEnding, setIsEnding]=useState<boolean>(false)
  const [isBidding, setIsBidding]=useState<boolean>(false)

  useEffect(() => {
    queryMintableAmount();
    queryBidder();
  }, [peerFedContract])

  async function queryMintableAmount() {
    if(!window.ethereum) return;
    if(!peerFedContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const peerfed = new ethers.Contract(peerFedContract, peerFedABI, provider);
    const mintableAmount = await peerfed.mintableAmount();
    setMintableToken0(Number(formatEther(mintableAmount.newToken0)));
    setMintableToken1(Number(formatEther(mintableAmount.newToken1)));

    const checkpoint = await peerfed.currentCheckpoint();
    const nextMintDate = new Date((checkpoint.blocktime + 1800) * 1000);
    setNextMintDate(nextMintDate);
  }

  async function queryBidder() {
    if(!window.ethereum) return;
    if(!peerFedContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const peerfed = new ethers.Contract(peerFedContract, peerFedABI, provider);

    const currentBid = await peerfed.currentBid();
    setCurrentBid(Number(formatEther(currentBid)));

    const currentBidder = await peerfed.currentBidder();
    if (currentBidder != ethers.constants.AddressZero) {
      setCurrentBidder(currentBidder);
    } else {
      setCurrentBidder('None');
    }
  }

  async function claim(e:React.FormEvent) {
    e.preventDefault();
    if (!window.ethereum || !peerFedContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const peerfed = new ethers.Contract(peerFedContract, peerFedABI, signer);
    try {
      const tr: TransactionResponse = await peerfed.mint();
      setIsEnding(true);
      console.log(`TransactionResponse TX hash: ${tr.hash}`);
      const receipt: TransactionReceipt = await tr.wait();
      await queryMintableAmount();
      await queryBidder();
      console.log("claim receipt",receipt);
    } catch (e:any) {
      console.error(e);
    } finally {
      setIsEnding(false)
    }
  }

  async function bid(e:React.FormEvent) {
    console.log("bid");
    e.preventDefault();
    if (!window.ethereum || !peerFedContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const peerfed = new ethers.Contract(peerFedContract, peerFedABI, signer);
    try {
      const value = parseEther(bidAmount);
      const tr: TransactionResponse = await peerfed.bid({ value: value });
      setIsBidding(true);
      console.log(`TransactionResponse TX hash: ${tr.hash}`);
      const receipt: TransactionReceipt = await tr.wait();
      await queryBidder();
      console.log("claim receipt",receipt);
    } catch (e:any) {
      console.error(e);
    } finally {
      setIsBidding(false);
    }
  }

  const handleBidChange = (value:string) => setBidAmount(value);

  const enableMint = currentAccount && nextMintDate < new Date();
  const enableBid = currentAccount && parseFloat(bidAmount) > currentBid;
  let formattedMintAt;
  if (nextMintDate) {
    const formattedDividendDate = nextMintDate.toLocaleDateString();
    const formattedDividendTime = nextMintDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    formattedMintAt = nextMintDate > new Date() ? `Auction ends at: ${formattedDividendDate} ${formattedDividendTime}` : 'Auction ends: Now';
  } else {
    formattedMintAt = 'Auction ends at: N/A';
  }

  const anyoneCanClaim = (new Date()).getTime() - nextMintDate.getTime() > 5 * 60 * 1000;
  const submitButtonText = enableMint && (currentBid == 0 || anyoneCanClaim) ? 'Claim Auction' : 'End Auction';
  const submittingText = enableMint && (currentBid == 0 || anyoneCanClaim) ? 'Claiming Auction' : 'Ending Auction';

  return (
    <div>
      <Text marginBottom="4">{formattedMintAt}</Text>
      <Text>Current bid: {currentBid.toFixed(8)} {gasSymbol}</Text>
      <Text>Current bidder: {currentBidder}</Text>
      <Text>Current reward: {mintableToken0.toFixed(4)} {token0Symbol}, {mintableToken1.toFixed(4)} {token1Symbol}</Text>
      <form onSubmit={claim}>
      <FormControl>
        <InputGroup marginTop="4" marginBottom="4">
          <NumberInput w='100%' value={bidAmount} min={0} onChange={handleBidChange}>
            <NumberInputField />
          </NumberInput>
          <InputRightAddon>{gasSymbol}</InputRightAddon>
        </InputGroup>
        <Button marginRight="2" isDisabled={!enableBid} isLoading={isBidding} loadingText='Bidding' onClick={bid}>Bid</Button>
        <Button type="submit" isDisabled={!enableMint} isLoading={isEnding} loadingText={submittingText}>{submitButtonText}</Button>
        <br/>
      </FormControl>
      </form>
    </div>
  )
}

export function eth(n: number) {
  return ethers.utils.parseEther(n.toString());
}