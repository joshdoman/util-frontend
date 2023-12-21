// src/component/TransferERC20.tsx
import React, { useEffect, useState } from 'react'
import { Button, NumberInput,  NumberInputField,  FormControl, InputGroup, Text, InputRightAddon, Stack, Link } from '@chakra-ui/react'
import {ethers} from 'ethers'
import {formatEther, parseEther} from 'ethers/lib/utils'
import { UtilABI as utilABI } from 'abi/UtilABI'
import { TransactionResponse,TransactionReceipt } from "@ethersproject/abstract-provider"

interface Props {
    utilContract: string,
    currentAccount: string | undefined,
    token0Symbol: string,
    token1Symbol: string,
    baseSymbol: string,
    baseBalance: any,
    blockExplorer: string,
    queryOverallState: () => void,
    queryBaseBalance: () => void,
    queryToken0Balance: () => void,
    queryToken1Balance: () => void,
}

declare let window: any;

export default function ClaimTokens(props:Props) {
  const utilContract = props.utilContract;
  const currentAccount = props.currentAccount;
  const token0Symbol = props.token0Symbol;
  const token1Symbol = props.token1Symbol;
  const baseSymbol = props.baseSymbol;
  const baseBalance = Number(props.baseBalance ?? '0');
  const blockExplorer = props.blockExplorer;

  const [bidAmount,setBidAmount]=useState<string>('0');
  const [mintableToken0,setMintableToken0]=useState<number>(0);
  const [mintableToken1,setMintableToken1]=useState<number>(0);
  const [currentBid,setCurrentBid]=useState<number>(0);
  const [currentBidder,setCurrentBidder]=useState<string>('N/A');
  const [currentTxHash,setCurrentTxHash]=useState<string>('');

  const [nextMintDate,setNextMintDate]=useState<Date>(new Date(0))
  const [isEnding, setIsEnding]=useState<boolean>(false)
  const [isBidding, setIsBidding]=useState<boolean>(false)

  useEffect(() => {
    queryMintableAmount();
    queryBidder();
  }, [utilContract])

  async function queryMintableAmount() {
    if(!window.ethereum) return;
    if(!utilContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const util = new ethers.Contract(utilContract, utilABI, provider);
    const mintableAmount = await util.mintableAmount();
    setMintableToken0(Number(formatEther(mintableAmount.newToken0)));
    setMintableToken1(Number(formatEther(mintableAmount.newToken1)));

    const checkpoint = await util.currentCheckpoint();
    const nextMintDate = new Date((checkpoint.blocktime + 1800) * 1000);
    setNextMintDate(nextMintDate);
  }

  async function queryBidder() {
    if(!window.ethereum) return;
    if(!utilContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const util = new ethers.Contract(utilContract, utilABI, provider);

    const currentBid = await util.currentBid();
    setCurrentBid(Number(formatEther(currentBid)));

    const currentBidder = await util.currentBidder();
    if (currentBidder != ethers.constants.AddressZero) {
      setCurrentBidder(currentBidder);
    } else {
      setCurrentBidder('None');
    }
  }

  async function claim(e:React.FormEvent) {
    e.preventDefault();
    if (!window.ethereum || !utilContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const util = new ethers.Contract(utilContract, utilABI, signer);
    try {
      const tr: TransactionResponse = await util.settle();
      setIsEnding(true);
      console.log(`TransactionResponse TX hash: ${tr.hash}`);
      setCurrentTxHash(tr.hash);
      const receipt: TransactionReceipt = await tr.wait();
      await queryMintableAmount();
      await queryBidder();
      props.queryOverallState();
      props.queryToken0Balance();
      props.queryToken1Balance();
      console.log("claim receipt",receipt);
    } catch (e:any) {
      console.error(e);
    } finally {
      setIsEnding(false)
    }
  }

  async function bid(e:React.FormEvent) {
    e.preventDefault();
    if (!window.ethereum || !utilContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const util = new ethers.Contract(utilContract, utilABI, signer);
    try {
      const value = parseEther(bidAmount);
      const tr: TransactionResponse = await util.bid({ value: value });
      setIsBidding(true);
      setCurrentTxHash(tr.hash);
      console.log(`TransactionResponse TX hash: ${tr.hash}`);
      const receipt: TransactionReceipt = await tr.wait();
      await queryBidder();
      props.queryBaseBalance()
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
      <Text>Current bid: {currentBid.toFixed(8)} {baseSymbol}</Text>
      <Text>Current bidder: {currentBidder}</Text>
      <Text>Current reward: {mintableToken0.toFixed(4)} {token0Symbol}, {mintableToken1.toFixed(4)} {token1Symbol}</Text>
      <form onSubmit={claim}>
      <FormControl>
        <InputGroup marginTop="4">
          <NumberInput w='100%' value={bidAmount} min={0} onChange={handleBidChange}>
            <NumberInputField />
          </NumberInput>
          <InputRightAddon>{baseSymbol}</InputRightAddon>
        </InputGroup>
        <Stack direction='row'>
          <Text align='right' fontSize='12' flexGrow="1">Balance: {baseBalance.toFixed(8)}</Text>
        </Stack>
        <Button marginRight="2" isDisabled={!enableBid} isLoading={isBidding} loadingText='Bidding' onClick={bid}>Bid</Button>
        <Button type="submit" isDisabled={!enableMint} isLoading={isEnding} loadingText={submittingText}>{submitButtonText}</Button>
        <br/>
        <Text marginTop="4" hidden={!isBidding && !isEnding}>
          View transaction: <Link color='blue.500' href={`${blockExplorer}tx/${currentTxHash}`} isExternal>{currentTxHash.substring(0,30)}...</Link>
        </Text>
      </FormControl>
      </form>
    </div>
  )
}

export function eth(n: number) {
  return ethers.utils.parseEther(n.toString());
}