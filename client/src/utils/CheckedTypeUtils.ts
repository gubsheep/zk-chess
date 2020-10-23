import { EthAddress } from "../_types/global/GlobalTypes";

// constructors for specific types
// this pattern ensures that LocationIds and Addresses can only be initialized through constructors that do
// appropriate validation
// see https://stackoverflow.com/questions/51813272/declaring-string-type-with-min-max-length-in-typescript

export const address: (str: string) => EthAddress = (str) => {
  let ret = str.toLowerCase();
  if (ret.slice(0, 2) === "0x") {
    ret = ret.slice(2);
  }
  for (const c of ret) {
    if ("0123456789abcdef".indexOf(c) === -1)
      throw new Error("not a valid address");
  }
  if (ret.length !== 40) throw new Error("not a valid address");
  return `0x${ret}` as EthAddress;
};

export const emptyAddress = address("0000000000000000000000000000000000000000");
export const almostEmptyAddress = address(
  "0000000000000000000000000000000000000001"
);
