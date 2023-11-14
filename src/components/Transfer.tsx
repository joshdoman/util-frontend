// src/component/TransferERC20.tsx
import React, { useEffect, useState } from 'react'
import {Alert, AlertDescription, AlertIcon, Box, Button, CloseButton, Input , NumberInput,  NumberInputField,  FormControl,  FormLabel, Radio, RadioGroup, Spinner, Stack, InputGroup, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Text, InputRightAddon } from '@chakra-ui/react'
import {BigNumber, ethers} from 'ethers'
import {formatEther, isAddress, parseEther} from 'ethers/lib/utils'
import { ERC20ABI as erc20ABI } from 'abi/ERC20ABI'
import { PeerFedABI as peerFedABI } from 'abi/PeerFedABI'
import { PeerFedLibraryExternalABI as libraryABI } from 'abi/PeerFedLibraryExternalABI'
import { TransactionResponse,TransactionReceipt } from "@ethersproject/abstract-provider"
import { useDisclosure } from '@chakra-ui/react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react'
import { format } from 'path'

interface Props {
    peerFedContract: string,
    currentAccount: string | undefined,
    baseBalance: any,
    quote: number | undefined,
}

declare let window: any;

export default function Convert(props:Props){
  const peerFedContract = props.peerFedContract;
  const currentAccount = props.currentAccount;
  const baseBalance = Number(props.baseBalance?.formatted ?? '0');
  var quote = props.quote;
  
  const [inputType, setInputType] = React.useState<string>('0')
  const [toAddress, setToAddress] = React.useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [input,setInput]=useState<string>('')
  const [slippageTolerance,setSlippageTolerance]=useState<string>('0.10')
  const [deadline,setDeadline]=useState<string>('10')
  const [isInvalidInput, setIsInvalidInput]=useState<boolean>(false)

  const [isTransferring, setisTransferring]=useState<boolean>(false)
  const { isOpen: isOpenModal, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure()

  var maxBTCAmount = (Number(input) / (quote ?? 1) / (1 - Number(slippageTolerance) / 100));

  async function transfer() {
    if(!window.ethereum) return
    if(!peerFedContract) return

    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()

    const now = new Date()
    var expiry = Math.trunc(now.getTime() / 1000) + Number(deadline) * 60

    // Add 10% margin to gas estimate to ensure sufficient gas
    const inputAmount = parseEther(input);
    const deadlineValue = BigNumber.from(expiry);
    const peerfed = new ethers.Contract(peerFedContract, peerFedABI, signer);

    try {
      let tr: TransactionResponse;
      if (inputType == '0') {
        quote = Number(formatEther(await peerfed.quote()));
        maxBTCAmount = Number(input) / (quote ?? 1) / (1 - Number(slippageTolerance) / 100);
        const maxValue = parseEther(maxBTCAmount.toFixed(18));
        const gasMargin = 1.1;
        const gasEstimated = await peerfed.estimateGas.transfer(toAddress, inputAmount, deadlineValue, { value: maxValue });
        console.log(gasEstimated);
        tr = await peerfed.transfer(toAddress, inputAmount, deadlineValue, { value: maxValue, gasLimit: Math.ceil(gasEstimated.toNumber() * gasMargin) });
      } else {
        const gasEstimated = await signer.sendTransaction({ to: toAddress, value: inputAmount });
        console.log(gasEstimated);
        tr = await signer.sendTransaction({ to: toAddress, value: inputAmount })
      }
      setisTransferring(true);
      console.log(`TransactionResponse TX hash: ${tr.hash}`);
      const receipt: TransactionReceipt = await tr.wait();
      console.log("transfer receipt",receipt);
      clearAmounts();
      onCloseModal();
    } catch (e:any) {
      console.error(e);
    } finally {
      setisTransferring(false)
    }
  }

  function clearAmounts() {
    setInput("")
    setIsInvalidInput(false)
  }

  const onInputTypeChange = (value:string) => {
    setInputType(value)
    setIsInvalidInput(false)
  }

  const handleInputChange = (value:string) => setInput(value)
  const handleToChange = (event:any) => setToAddress(event.target.value)
  const handleSlippageChange = (value:string) => setSlippageTolerance(value)
  const handleDeadlineChange = (value:string) => setDeadline(value)
  const handleAdvancedToggleChange = () => setShowAdvanced(!showAdvanced)

  const invalidInput = isInvalidInput ? (
    <Alert status='error'>
      <AlertIcon />
      Input too large
    </Alert>
  ) : null

  const slippageComponent = showAdvanced ? (
    <>
      <FormLabel htmlFor='amount'>Slippage tolerance: </FormLabel>
      <InputGroup>
      <NumberInput value={slippageTolerance} min={0} max={10} onChange={handleSlippageChange}>
        <NumberInputField />
      </NumberInput>
      <InputRightAddon>%</InputRightAddon>
      </InputGroup>
      <br/>
    </>
  ) : null;

  const deadlineComponent = showAdvanced ? (
    <>
      <FormLabel htmlFor='amount'>Deadline: </FormLabel>
      <InputGroup>
      <NumberInput value={deadline} min={0} max={120} onChange={handleDeadlineChange}>
        <NumberInputField />
      </NumberInput>
      <InputRightAddon>minutes</InputRightAddon>
      </InputGroup>
      <br/>
    </>
  ) : null;

  const advancedToggleText = showAdvanced ? "Hide advanced" : "Show advanced"

  let balance: number;
  let symbol: string;
  if (inputType == '0') {
    symbol = 'units';
    balance = quote ? baseBalance * quote : 0;
  } else {
    symbol = 'BTC';
    balance = baseBalance;
  }

  return (
    <div>
      <form onSubmit={(e:React.FormEvent) => {
        e.preventDefault();
        onOpenModal();
      }}>
      <FormControl>
        <FormLabel>Denomination: </FormLabel>
        <RadioGroup onChange={onInputTypeChange} value={inputType}>
          <Stack marginBottom='2' direction='row'>
            <Radio value='0'>Units</Radio>
            {/* <Radio value='1'>Bonds</Radio> */}
            <Radio value='1'>BTC</Radio>
          </Stack>
        </RadioGroup>
        <FormLabel htmlFor='amount'>Amount: </FormLabel>
        <InputGroup>
        <NumberInput value={input} min={0} w='100%' onChange={handleInputChange}>
          <NumberInputField />
        </NumberInput>
        <InputRightAddon>{symbol}</InputRightAddon>
        </InputGroup>
        <Stack direction='row'>
          {/* <Text align='left' fontSize='12' as='i' hidden={!inputValue}>${numberWithCommas(inputValue, 2)}</Text> */}
          <Text align='right' fontSize='12' flexGrow="1">Balance: {balance.toFixed(8)}</Text>
        </Stack>
        <FormLabel htmlFor='amount'>To: </FormLabel>
        <InputGroup marginBottom='4'>
        <Input min={0} w='100%' placeholder='0x00000000...' value={toAddress} onChange={handleToChange} />
        </InputGroup>
        {invalidInput}
        {slippageComponent}
        {deadlineComponent}
        <Button type="submit" isDisabled={!currentAccount || !input || !isAddress(toAddress)} isLoading={isTransferring} loadingText='Transferring'>Transfer</Button>
        <Button onClick={handleAdvancedToggleChange} colorScheme='gray' size='sm' variant='link' marginLeft='4'>{advancedToggleText}</Button>
      </FormControl>
      </form>

      <Modal isOpen={isOpenModal} onClose={onCloseModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review Transfer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>You pay:</Text>
              <Text align='right' flexGrow="1" as='b'>{Number(input).toFixed(4)} {symbol}</Text>
            </Stack>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>To:</Text>
              <Text align='right' flexGrow="1" as='b' noOfLines={1}>{toAddress}</Text>
            </Stack>
            {
              inputType == '0' && (
                <>
                <br/>
                <Stack marginBottom='2' direction='row'>
                  <Text align='left'>Expected BTC amount:</Text>
                  <Text align='right' flexGrow="1">{(Number(input) / (quote ?? 1)).toFixed(4)} BTC</Text>
                </Stack>
                <Stack marginBottom='2' direction='row'>
                  <Text align='left'>Slippage tolerance:</Text>
                  <Text align='right' flexGrow="1">{slippageTolerance}%</Text>
                </Stack>
                <Stack marginBottom='2' direction='row'>
                  <Text align='left'>Maximum BTC amount:</Text>
                  <Text align='right' flexGrow="1">{maxBTCAmount.toFixed(4)} BTC</Text>
                </Stack>
                </>
              )
            }
          </ModalBody>

          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={onCloseModal}>
              Close
            </Button>
            <Button colorScheme='blue' onClick={transfer} isLoading={isTransferring} loadingText='Confirming'>Confirm</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

export function eth(n: number) {
  return ethers.utils.parseEther(n.toString());
}

// https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
export function numberWithCommas(x: number, decimals: number) {
  return x.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}