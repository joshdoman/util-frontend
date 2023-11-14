// src/component/TransferERC20.tsx
import React, { useEffect, useState } from 'react'
import {Alert, AlertDescription, AlertIcon, Box, Button, CloseButton, Input , NumberInput,  NumberInputField,  FormControl,  FormLabel, Radio, RadioGroup, Spinner, Stack, InputGroup, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Text, InputRightAddon } from '@chakra-ui/react'
import {ethers} from 'ethers'
import {formatEther} from 'ethers/lib/utils'
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
}

declare let window: any;

export default function ClaimTokens(props:Props) {
  const peerFedContract = props.peerFedContract;
  const currentAccount = props.currentAccount;
  const token0Balance = Number(props.token0Balance ?? '0');
  const token1Balance = Number(props.token1Balance ?? '0');
  const token0Symbol = props.token0Symbol;
  const token1Symbol = props.token1Symbol;

  const [mintableToken0,setMintableToken0]=useState<number>(0);
  const [mintableToken1,setMintableToken1]=useState<number>(0);

  const [nextMintDate,setNextMintDate]=useState<Date>(new Date(0))
  const [isClaiming, setIsClaiming]=useState<boolean>(false)
  const [isSimulating, setIsSimulating]=useState<boolean>(false)

  useEffect(() => {
    queryMintableAmount();
  }, [peerFedContract])

  async function queryMintableAmount() {
    if(!window.ethereum) return;
    if(!peerFedContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const peerfed = new ethers.Contract(peerFedContract, peerFedABI, provider);
    const mintableAmount = await peerfed.mintableAmount();
    setMintableToken0(Number(formatEther(mintableAmount.newToken0)));
    setMintableToken1(Number(formatEther(mintableAmount.newToken1)));

    const lastCheckpoint = await peerfed.checkpointTimestampLast();
    const nextMintDate = new Date((lastCheckpoint + 3600) * 1000);
    setNextMintDate(nextMintDate);
  }

  async function claim(e:React.FormEvent) {
    e.preventDefault();
    if (!window.ethereum || !peerFedContract) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const peerfed = new ethers.Contract(peerFedContract, peerFedABI, signer);
    try {
      const tr: TransactionResponse = await peerfed.mintTo(currentAccount);
      setIsClaiming(true);
      console.log(`TransactionResponse TX hash: ${tr.hash}`);
      const receipt: TransactionReceipt = await tr.wait();
      await queryMintableAmount();
      console.log("claim receipt",receipt);
    } catch (e:any) {
      console.error(e);
    } finally {
      setIsClaiming(false)
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

  const enableWithdraw = currentAccount && (mintableToken0 || mintableToken1);
  let formattedMintAt;
  if (nextMintDate) {
    const formattedDividendDate = nextMintDate.toLocaleDateString();
    const formattedDividendTime = nextMintDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    formattedMintAt = nextMintDate > new Date() ? `Next mint available at: ${formattedDividendDate} ${formattedDividendTime}` : 'Next mint available starting: Now';
  } else {
    formattedMintAt = 'Available starting at: N/A';
  }

  return (
    <div>
      <Text>{formattedMintAt}</Text>
      <br/>
      <form onSubmit={claim}>
      <FormControl>
        <InputGroup>
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
        </Stack>
        <Button type="submit" isDisabled={!enableWithdraw} isLoading={isClaiming} loadingText='Minting'>Mint</Button>
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