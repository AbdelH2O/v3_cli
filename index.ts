import { Metaplex, toBigNumber, keypairIdentity, getMerkleProof, CreateCandyMachineOutput, DefaultCandyGuardSettings, getMerkleRoot, toDateTime } from "@metaplex-foundation/js";
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
// import md5 from "md5";
import MerkleTree from "merkletreejs";
// import keccak256 from "keccak256";
import { keccak_256 } from "@noble/hashes/sha3";
// @ts-ignore
import bs58 from "@project-serum/anchor/dist/cjs/utils/bytes";

export function loadWalletKey(keypair: string): Keypair {
    if (!keypair || keypair == '') {
      throw new Error('Keypair is required!');
    }
  
    const decodedKey = new Uint8Array(
      keypair.endsWith('.json') && !Array.isArray(keypair)
        ? JSON.parse(fs.readFileSync(keypair).toString())
        : bs58.decode(keypair),
    );
  
    const loaded = Keypair.fromSecretKey(decodedKey);
    console.log(`wallet public key: ${loaded.publicKey}`);
    return loaded;
  }

const work = async (
    cache: {
        items: {
            [key: string]: {
                name: string;
                image_hash: string;
                image_link: string;
                metadata_hash: string;
                metadata_link: string;
                onChain: boolean;
            };
        }
    },
    config: {
        price: number;
        number: number;
        gatekeeper: string;
        creators: {
            address: string;
            share: number;
        }[];
        solTreasuryAccount: string;
        goLiveDate: string;
        symbol: string;
        sellerFeeBasisPoints: number;
        isMutable: boolean;
        whitelisted: string[];
        prefixName: string;
        prefixUri: string;
        mintLimit: number;
    }
) => {
    const connection = new Connection(clusterApiUrl("devnet"));
    const metaplex = new Metaplex(connection);
    metaplex.use(keypairIdentity(loadWalletKey("/Users/hana/.config/solana/id2.json")));
    const { nft } = await metaplex.nfts().create({
        isCollection: true,
        name: cache.items["-1"].name,
        symbol: config.symbol,
        sellerFeeBasisPoints: config.sellerFeeBasisPoints,
        uri: cache.items["-1"].metadata_link,
        creators: config.creators.map((creator) => ({
            address: new PublicKey(creator.address),
            share: creator.share,
        })),
    });
    const merkleRoot = getMerkleRoot(config.whitelisted);
    const candy = await metaplex.candyMachines().create(
        {
            collection: {
                address: nft.address,
                updateAuthority: metaplex.identity(),
            },
            itemsAvailable: toBigNumber(10),
            withoutCandyGuard: false,
            authority: metaplex.identity(),
            sellerFeeBasisPoints: 250,
            creators: config.creators.map((creator) => ({
                address: new PublicKey(creator.address),
                share: creator.share,
            })),
            isMutable: config.isMutable,
            symbol: config.symbol,
            groups: [],
            itemSettings: {
                isSequential: false,
                prefixName: config.prefixName,
                prefixUri: config.prefixUri,
                type: "configLines",
                nameLength: 4,
                uriLength: 43,
            },
            guards: {
                allowList: {
                    merkleRoot
                },
                botTax: {
                    lamports: {
                        basisPoints: toBigNumber(10000),
                        currency: {
                            decimals: 9,
                            symbol: "SOL",
                        }
                    },
                    lastInstruction: true,
                },
                mintLimit: {
                    limit: config.mintLimit,
                    id: 1,
                },
                solPayment: {
                    amount: {
                        basisPoints: toBigNumber(config.price*LAMPORTS_PER_SOL),
                        currency: {
                            decimals: 9,
                            symbol: "SOL",
                        },
                    },
                    destination: new PublicKey(config.solTreasuryAccount),
                },
            },

        }
    );
    console.log(candy);
    console.log(candy.candyMachine.address.toString());
    return candy;
}

const wo = async (
    cache: {
        items: {
            [key: string]: {
                name: string;
                image_hash: string;
                image_link: string;
                metadata_hash: string;
                metadata_link: string;
                onChain: boolean;
            };
        }
    },
    config: {
        price: number;
        number: number;
        gatekeeper: string;
        creators: {
            address: string;
            share: number;
        }[];
        solTreasuryAccount: string;
        goLiveDate: string;
        symbol: string;
        sellerFeeBasisPoints: number;
        isMutable: boolean;
        whitelisted: string[];
        prefixName: string;
        prefixUri: string;
        mintLimit: number;
    },
    candy: Promise<CreateCandyMachineOutput<DefaultCandyGuardSettings>>
) => {
    const candyMachine = await candy;
    const connection = new Connection(clusterApiUrl("devnet"));
    const metaplex = new Metaplex(connection);
    metaplex.use(keypairIdentity(loadWalletKey("/Users/hana/.config/solana/id2.json")));
    // const { nft } = await metaplex.nfts().create({
    //     isCollection: false,
    //     collection: new PublicKey('7jH7RR9N1i7mxrdrMcZTpJVobVgeX2xsVYJHyVkoM53D'),
    //     name: "My Collection",
    //     symbol: "COL",
    //     sellerFeeBasisPoints: 250,
    //     uri: "https://arweave.net/aqHKDlFeLjm7ALSACv46xQAGTT8Hi1iB5TITwM7k8-g",
    //     creators: [
    //         {
    //             address: metaplex.identity().publicKey,
    //             share: 100,
    //         },
    //     ],
    // });
    // console.log(nft);
    // const candy = await metaplex.candyMachines().findByAddress({
    //     address: new PublicKey('5vobDk3BGuC5fPrdrqkeLWfLkzDkE4Y7yPgcVAexs1XD'),
    // });
    // console.log(candy);
    // const resp = await metaplex.candyMachines().insertItems({
    //     candyMachine: candy,
    //     items: [{
    //         uri: "aqHKDlFeLjm7ALSACv46xQAGTT8Hi1iB5TITwM7k8-g",
    //         name: "1",
    //     }],
    // });
    // console.log(resp);
    const bad: string[] = [];
    Object.keys(cache.items).forEach(async (item) => {
        if (item === "-1") {
            return;
        }
        const resp = await metaplex.candyMachines().insertItems({
            candyMachine: candyMachine.candyMachine,
            items: [{
                uri: cache.items[item].metadata_link.slice('https://arweave.net/'.length),
                name: item,
            }],
        });
        console.log(resp);
        if(resp.response.confirmResponse.value.err) {
            console.log(resp.response.confirmResponse.value.err);
            bad.push(item);
        }
    });
    console.log(bad);

    // save the bad array to bad.json
    fs.writeFileSync('bad.json', JSON.stringify(bad));


    // const merkleRoot = getMerkleRoot(["7B7DLKM9XsejpxFpNwfsnj2frVXx9mqnbiDqnQq2yuFx"]);
    // console.log(String.fromCharCode.apply(null, root));
    

    // const proof = getMerkleProof(
    //     ["7B7DLKM9XsejpxFpNwfsnj2frVXx9mqnbiDqnQq2yuFx"],
    //     "7B7DLKM9XsejpxFpNwfsnj2frVXx9mqnbiDqnQq2yuFx"
    // );

    // console.log(proof);
    

    // const resp = await metaplex.candyMachines().callGuardRoute({
    //     candyMachine: candy,
    //     guard: "allowList",
    //     settings: {
    //         path: "proof",
    //         merkleProof: [],
    //     }
    // });
    // console.log(resp);

    // const respo = await metaplex.candyMachines().mint({
    //     candyMachine: candy,
    //     collectionUpdateAuthority: metaplex.identity().publicKey,

    // });
    // console.log(respo);
    // const resp = await metaplex.candyMachines().createCandyGuard({
    //     guards: {
    //         allowList: {
    //             merkleRoot
    //         },
    //     }
    // });
    // const rspp = await metaplex.candyMachines().wrapCandyGuard({
    //     candyGuard: new PublicKey("F8T7CHihjFxsbK6qivq7onWv1BAQeFRSUisuA3RmaSqs"),
    //     candyMachine: new PublicKey("5vobDk3BGuC5fPrdrqkeLWfLkzDkE4Y7yPgcVAexs1XD"),
    //     candyMachineAuthority: metaplex.identity(),
    // })
    // console.log(rspp);
    
    
    // const resp = await metaplex.candyMachines().guards().
    
    // const resp = await metaplex.candyMachines().update({
    //     candyMachine: candy,
    //     itemSettings: {
    //         isSequential: false,
    //         prefixName: "My Collection $ID$",
    //         prefixUri: "https://arweave.net/",
    //         type: "configLines",
    //         nameLength: 4,
    //         uriLength: 50,
    //     },
    // });
    // console.log(resp);
    
};

const parseCache = (path: string) => {
    return JSON.parse(fs.readFileSync(path, "utf8"));
    
};

// const cache = parseCache("./cache.json");
// const config = parseCache("./config.json");
// const candyMachine = work(cache, config);
// wo(cache, config, candyMachine);
// const proof = getMerkleProof([
//     "2vkX38vAResQwVAacEZH5ERPrzPoKCMuGgfKtD7fgkKY",
//     "Cxax9Sv81Eo7jD77t4q95vongSi7KFii1JHmgU9PpJbA",
//     "DK62svKZgVNdKSNhBM8gAPbSfRuS6gcJV9HsP9kkkQa7",
//     "48cnQ6KFpyKoza8BRiNEqZNv8x4FTuyDF5qPztXC95tk",
//   ], "2vkX38vAResQwVAacEZH5ERPrzPoKCMuGgfKtD7fgkKY");
// // @ts-ignore
// console.log(keccak256(getMerkleRoot([
//     "a", "b", "c", "c"
// ])));
const getMerkleTree = (data: string[]) => {
    return new MerkleTree(data.map(keccak_256), keccak_256, {
      sortPairs: true,
    });
};


// console.log([proof[0], proof[1].valueOf()]);
// const addresses = parseCache("./VIP.json");
// const out: {
//     [key: string]: string[];
// } = {
//     "OG": [],
//     "VIP": [],
//     "WL": [],
// }
// addresses.forEach((submission: {role: string, wallet: string}) => {
//     if (submission.role === "｜OG TRIBE") {
//         out.OG.push(submission.wallet);
//     } else if (submission.role === "| PANT VIP") {
//         out.VIP.push(submission.wallet);
//     } else if (submission.role === "｜PANTLIST") {
//         out.WL.push(submission.wallet);
//     }
// });
// fs.writeFileSync('out.json', JSON.stringify(out, null, 4));
// fs.writeFileSync('wl.json', JSON.stringify(out.WL, null, 4));
// fs.writeFileSync('OG.json', JSON.stringify(out.OG, null, 4));
// fs.writeFileSync('VIP.json', JSON.stringify(out.VIP, null, 4));
// console.log(getMerkleTree(addresses).getRoot().toString("hex"));
const dd = async () => {
    const connection = new Connection(clusterApiUrl("mainnet-beta"));
    const metaplex = new Metaplex(connection);
    metaplex.use(keypairIdentity(loadWalletKey("/Users/hana/Downloads/panter.json")));
    const vip = parseCache("./VIP.json");
    const og = parseCache("./OG.json");
    const wl = parseCache("./wl.json");
    const rootVIP = getMerkleRoot(vip);
    const rootOG = getMerkleRoot(og);
    const rootWL = getMerkleRoot(wl);

    // const respo = await metaplex.nfts().findByMint({
    //     mintAddress: new PublicKey("94AGSpDNYw9yrveSaHCzmb2xLqoZTyDkfo1CC7nfs7v1")
    // })

    // const respi = await metaplex.nfts().update({
    //     nftOrSft: respo,
    //     name: "PANTERS",
    // })

    const resp = await metaplex.candyMachines().updateCandyGuard({
        candyGuard: new PublicKey("FNQiP8B3twUqUvtRmTX1de3pWNT5nWBQG6YNSnHL3g3M"),
        groups: [
            {
              label: "Public",
              guards: {
                startDate: {
                    date: toDateTime("2022-10-23T20:30:00Z"),
                }
              },
            },
            {
              label: "Og",
              guards: {
                allowList: {
                  merkleRoot: rootOG,
                },
                mintLimit: {
                  id: 1,
                  limit: 3,
                },
              },
            },
            {
              label: "Wl",
              guards: {
                allowList: {
                  merkleRoot: rootWL,
                },
                mintLimit: {
                  id: 2,
                  limit: 1,
                },
              },
            },
            {
              label: "Vip",
              guards: {
                allowList: {
                  merkleRoot: rootVIP,
                },
                mintLimit: {
                  id: 4,
                  limit: 5,
                },
                
              },
            }
          ],
        guards: {
            solPayment: {
                amount: {
                    basisPoints: toBigNumber(1.5*LAMPORTS_PER_SOL),
                    currency: {
                        decimals: 9,
                        symbol: "SOL",
                    },
                },
                destination: metaplex.identity().publicKey,
            }
        }
    });
    console.log(resp);
};
dd();
