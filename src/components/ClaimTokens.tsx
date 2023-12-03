// src/component/TransferERC20.tsx
import React, { useEffect, useState } from 'react'
import {Alert, AlertDescription, AlertIcon, Box, Button, CloseButton, Input , NumberInput,  NumberInputField,  FormControl,  FormLabel, Radio, RadioGroup, Spinner, Stack, InputGroup, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Text, InputRightAddon } from '@chakra-ui/react'
import {ethers} from 'ethers'
import {formatEther, parseEther} from 'ethers/lib/utils'
import { PeerFedABI as peerFedABI } from 'abi/PeerFedABI'
import { TransactionResponse,TransactionReceipt } from "@ethersproject/abstract-provider"
import { numberWithCommas } from './Convert'

interface Props {
    peerFedContract: string,
    currentAccount: string | undefined,
    token0Balance: any,
    token1Balance: any,
    token0Symbol: string,
    token1Symbol: string,
    gasSymbol: string,
}

declare let window: any;

export default function ClaimTokens(props:Props) {
  const peerFedContract = props.peerFedContract;
  const currentAccount = props.currentAccount;
  const token0Balance = Number(props.token0Balance ?? '0');
  const token1Balance = Number(props.token1Balance ?? '0');
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
  const [isSimulating, setIsSimulating]=useState<boolean>(false)

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
    if (currentBidder != '0x0000000000000000000000000000000000000000') {
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

  // async function simulate(e:React.FormEvent) {
  //   e.preventDefault();
  //   if (!window.ethereum || !vaultContract) return;
  //   const provider = new ethers.providers.Web3Provider(window.ethereum)
  //   const signer = provider.getSigner()
  //   const vault = new ethers.Contract(vaultContract, vaultABI, signer);
  //   try {
  //     const tr: TransactionResponse = await vault.simulateDividendLifecycle();
  //     setIsSimulating(true);
  //     console.log(`TransactionResponse TX hash: ${tr.hash}`);
  //     const receipt: TransactionReceipt = await tr.wait();
  //     await refresh();
  //     console.log("simulation receipt",receipt);
  //   } catch (e:any) {
  //     console.error(e);
  //   } finally {
  //     setIsSimulating(false)
  //   }
  // }

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

  return (
    <div>
      <Text marginBottom="4">{formattedMintAt}</Text>
      <Text>Current bid: {currentBid.toFixed(8)} {gasSymbol}</Text>
      <Text>Current bidder: {currentBidder}</Text>
      <Text>Current reward: {token0Balance.toFixed(4)} {token0Symbol}, {token1Balance.toFixed(4)} {token1Symbol}</Text>
      <form onSubmit={claim}>
      <FormControl>
        <InputGroup marginTop="4" marginBottom="4">
          <NumberInput w='100%' value={bidAmount} min={0} onChange={handleBidChange}>
            <NumberInputField />
          </NumberInput>
          <InputRightAddon>{gasSymbol}</InputRightAddon>
        </InputGroup>
        {/* <InputGroup>
        <NumberInput w='100%'>
          <NumberInputField placeholder={mintableToken0.toString()} disabled />
        </NumberInput>
        <InputRightAddon>{token0Symbol}</InputRightAddon>
        </InputGroup>
        <Stack marginBottom='2' direction='row'>
          <Text align='right' fontSize='12' flexGrow="1">Balance: {token0Balance.toFixed(4)}</Text>
        </Stack>
        <InputGroup>
        <NumberInput w='100%'>
          <NumberInputField placeholder={mintableToken1.toString()} disabled />
        </NumberInput>
        <InputRightAddon>{token1Symbol}</InputRightAddon>
        </InputGroup>
        <Stack marginBottom='2' direction='row'>
          <Text align='right' fontSize='12' flexGrow="1">Balance: {token1Balance.toFixed(4)}</Text>
        </Stack> */}
        <Button marginRight="2" isDisabled={!enableBid} isLoading={isBidding} loadingText='Bidding' onClick={bid}>Bid</Button>
        <Button type="submit" isDisabled={!enableMint} isLoading={isEnding} loadingText='Ending Auction'>End Auction</Button>
        {/* <Button onClick={simulate} colorScheme='gray' size='sm' variant='link' marginLeft='4' isLoading={isSimulating} loadingText='Simulating'>Simulate</Button> */}
        <br/>
      </FormControl>
      </form>
    </div>
  )
}

export function eth(n: number) {
  return ethers.utils.parseEther(n.toString());
}