//src/components/header.tsx
import NextLink from "next/link"
import { Flex, useColorModeValue, Heading, LinkBox, LinkOverlay } from '@chakra-ui/react'

const siteTitle="Util Testnet"
export default function Header() {

  return (
    <Flex as='header' bg={useColorModeValue('gray.100', 'gray.900')} p={4} alignItems='center'>
      <LinkBox>
        <NextLink href={'/'} passHref>
          <LinkOverlay>
            <Heading size="md">{siteTitle}</Heading>
          </LinkOverlay>
        </NextLink>
      </LinkBox>
    </Flex>
  )

  // <Spacer />
  // <Button >Button for Account </Button>
}
