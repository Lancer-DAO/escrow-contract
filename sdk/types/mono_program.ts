export type MonoProgram = {
  "version": "0.1.0",
  "name": "mono_program",
  "instructions": [
    {
      "name": "createFeatureFundingAccount",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "fundsMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "arg",
                "type": "string",
                "path": "unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "arg",
                "type": "string",
                "path": "unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "funds_mint"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "unixTimestamp",
          "type": "string"
        }
      ]
    },
    {
      "name": "fundFeature",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "creatorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fundsMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "funds_mint"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "addApprovedSubmitters",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "submitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "submitRequest",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "submitter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "payoutAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "approveRequest",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "submitter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payoutAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payoutCompleterTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "creatorCompanyTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.funds_mint"
              }
            ]
          }
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "TokenAccount",
                "path": "feature_token_account.mint"
              }
            ]
          }
        },
        {
          "name": "lancerTokenProgramAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "lancerCompleterTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lancerCompanyTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "programMintAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mint_authority"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "mintBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "denyRequest",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "submitter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "voteToCancel",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "isCancel",
          "type": "bool"
        }
      ]
    },
    {
      "name": "cancelFeature",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "creatorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.funds_mint"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "removeApprovedSubmitters",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "submitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createLancerTokenAccount",
      "accounts": [
        {
          "name": "lancerAdmin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "fundsMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "funds_mint"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createLancerTokens",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "lancerCompleterTokens",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "type": "publicKey",
                "path": "admin"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "lancer_completer_tokens"
              }
            ]
          }
        },
        {
          "name": "lancerCompanyTokens",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "type": "publicKey",
                "path": "admin"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "lancer_company_tokens"
              }
            ]
          }
        },
        {
          "name": "programMintAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mint_authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "withdrawTokens",
      "accounts": [
        {
          "name": "lancerAdmin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "withdrawer",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "withdrawerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "lancerTokenProgramAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "withdrawBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "approveRequestThirdParty",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "thirdParty",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "submitter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payoutAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payoutCompleterTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "creatorCompanyTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.funds_mint"
              }
            ]
          }
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "TokenAccount",
                "path": "feature_token_account.mint"
              }
            ]
          }
        },
        {
          "name": "lancerTokenProgramAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "lancerCompleterTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lancerCompanyTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "programMintAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mint_authority"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "enableMultipleSubmitters",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "submitRequestMultiple",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "submitter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "setShareMultipleSubmitters",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "submitter",
          "type": "publicKey"
        },
        {
          "name": "submitterShare",
          "type": "f32"
        }
      ]
    },
    {
      "name": "approveRequestMultiple",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.funds_mint"
              }
            ]
          }
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "TokenAccount",
                "path": "feature_token_account.mint"
              }
            ]
          }
        },
        {
          "name": "lancerTokenProgramAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "featureDataAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "requestSubmitted",
            "type": "bool"
          },
          {
            "name": "currentSubmitter",
            "type": "publicKey"
          },
          {
            "name": "approvedSubmitters",
            "type": {
              "array": [
                "publicKey",
                5
              ]
            }
          },
          {
            "name": "approvedSubmittersShares",
            "type": {
              "array": [
                "f32",
                5
              ]
            }
          },
          {
            "name": "fundsMint",
            "type": "publicKey"
          },
          {
            "name": "fundsTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "payoutAccount",
            "type": "publicKey"
          },
          {
            "name": "funderCancel",
            "type": "bool"
          },
          {
            "name": "payoutCancel",
            "type": "bool"
          },
          {
            "name": "noOfSubmitters",
            "type": "u8"
          },
          {
            "name": "isMultipleSubmitters",
            "type": "bool"
          },
          {
            "name": "fundsTokenAccountBump",
            "type": "u8"
          },
          {
            "name": "fundsDataAccountBump",
            "type": "u8"
          },
          {
            "name": "programAuthorityBump",
            "type": "u8"
          },
          {
            "name": "unixTimestamp",
            "type": "string"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotTheCreator",
      "msg": "This Creator is Invalid"
    },
    {
      "code": 6001,
      "name": "InvalidMint",
      "msg": "This mint is not valid"
    },
    {
      "code": 6002,
      "name": "MaxApprovedSubmitters",
      "msg": "Max Number of Approved Submitters already reached"
    },
    {
      "code": 6003,
      "name": "MinApprovedSubmitters",
      "msg": "Max Number of Approved Submitters already reached"
    },
    {
      "code": 6004,
      "name": "PendingRequestAlreadySubmitted",
      "msg": "There is an active request already present"
    },
    {
      "code": 6005,
      "name": "NoActiveRequest",
      "msg": "No Request Submitted yet"
    },
    {
      "code": 6006,
      "name": "CannotPayFee",
      "msg": "Insufficient funds to pay lancer fee"
    },
    {
      "code": 6007,
      "name": "CannotCancelFeature",
      "msg": "Cannot Cancel Feature"
    },
    {
      "code": 6008,
      "name": "InvalidAdmin",
      "msg": "You are not the Admin"
    },
    {
      "code": 6009,
      "name": "NotApprovedSubmitter",
      "msg": "You do not have permissions to submit"
    },
    {
      "code": 6010,
      "name": "ExpectedSingleSubmitter",
      "msg": "This Instruction is used for only a single submitter."
    },
    {
      "code": 6011,
      "name": "ExpectedMultipleSubmitters",
      "msg": "This Instruction is used for only Multiple submitters."
    },
    {
      "code": 6012,
      "name": "MaxShareExceeded",
      "msg": "Share Cannot Exceed 100"
    },
    {
      "code": 6013,
      "name": "ShareMustBe100",
      "msg": "Share must be 100"
    },
    {
      "code": 6014,
      "name": "NotOwnedBySplToken",
      "msg": "Token Error"
    }
  ]
};

export const IDL: MonoProgram = {
  "version": "0.1.0",
  "name": "mono_program",
  "instructions": [
    {
      "name": "createFeatureFundingAccount",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "fundsMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "arg",
                "type": "string",
                "path": "unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "arg",
                "type": "string",
                "path": "unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "funds_mint"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "unixTimestamp",
          "type": "string"
        }
      ]
    },
    {
      "name": "fundFeature",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "creatorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fundsMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "funds_mint"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "addApprovedSubmitters",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "submitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "submitRequest",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "submitter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "payoutAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "approveRequest",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "submitter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payoutAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payoutCompleterTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "creatorCompanyTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.funds_mint"
              }
            ]
          }
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "TokenAccount",
                "path": "feature_token_account.mint"
              }
            ]
          }
        },
        {
          "name": "lancerTokenProgramAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "lancerCompleterTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lancerCompanyTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "programMintAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mint_authority"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "mintBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "denyRequest",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "submitter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "voteToCancel",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "isCancel",
          "type": "bool"
        }
      ]
    },
    {
      "name": "cancelFeature",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "creatorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.funds_mint"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "removeApprovedSubmitters",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "submitter",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "createLancerTokenAccount",
      "accounts": [
        {
          "name": "lancerAdmin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "fundsMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "funds_mint"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createLancerTokens",
      "accounts": [
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "lancerCompleterTokens",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "type": "publicKey",
                "path": "admin"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "lancer_completer_tokens"
              }
            ]
          }
        },
        {
          "name": "lancerCompanyTokens",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "type": "publicKey",
                "path": "admin"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "lancer_company_tokens"
              }
            ]
          }
        },
        {
          "name": "programMintAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mint_authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "withdrawTokens",
      "accounts": [
        {
          "name": "lancerAdmin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "withdrawer",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "withdrawerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "Mint",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "lancerTokenProgramAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "withdrawBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "approveRequestThirdParty",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "thirdParty",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "submitter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payoutAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payoutCompleterTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "creatorCompanyTokensAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.funds_mint"
              }
            ]
          }
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "TokenAccount",
                "path": "feature_token_account.mint"
              }
            ]
          }
        },
        {
          "name": "lancerTokenProgramAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "lancerCompleterTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "lancerCompanyTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "programMintAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mint_authority"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "enableMultipleSubmitters",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "submitRequestMultiple",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "submitter",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "setShareMultipleSubmitters",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "submitter",
          "type": "publicKey"
        },
        {
          "name": "submitterShare",
          "type": "f32"
        }
      ]
    },
    {
      "name": "approveRequestMultiple",
      "accounts": [
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "featureDataAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "featureTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "account",
                "type": "string",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.unix_timestamp"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "path": "creator"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "FeatureDataAccount",
                "path": "feature_data_account.funds_mint"
              }
            ]
          }
        },
        {
          "name": "lancerDaoTokenAccount",
          "isMut": true,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              },
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              },
              {
                "kind": "account",
                "type": "publicKey",
                "account": "TokenAccount",
                "path": "feature_token_account.mint"
              }
            ]
          }
        },
        {
          "name": "lancerTokenProgramAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "LANCER_DAO"
              }
            ]
          }
        },
        {
          "name": "programAuthority",
          "isMut": false,
          "isSigner": false,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "type": "string",
                "value": "mono"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "featureDataAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "requestSubmitted",
            "type": "bool"
          },
          {
            "name": "currentSubmitter",
            "type": "publicKey"
          },
          {
            "name": "approvedSubmitters",
            "type": {
              "array": [
                "publicKey",
                5
              ]
            }
          },
          {
            "name": "approvedSubmittersShares",
            "type": {
              "array": [
                "f32",
                5
              ]
            }
          },
          {
            "name": "fundsMint",
            "type": "publicKey"
          },
          {
            "name": "fundsTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "payoutAccount",
            "type": "publicKey"
          },
          {
            "name": "funderCancel",
            "type": "bool"
          },
          {
            "name": "payoutCancel",
            "type": "bool"
          },
          {
            "name": "noOfSubmitters",
            "type": "u8"
          },
          {
            "name": "isMultipleSubmitters",
            "type": "bool"
          },
          {
            "name": "fundsTokenAccountBump",
            "type": "u8"
          },
          {
            "name": "fundsDataAccountBump",
            "type": "u8"
          },
          {
            "name": "programAuthorityBump",
            "type": "u8"
          },
          {
            "name": "unixTimestamp",
            "type": "string"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotTheCreator",
      "msg": "This Creator is Invalid"
    },
    {
      "code": 6001,
      "name": "InvalidMint",
      "msg": "This mint is not valid"
    },
    {
      "code": 6002,
      "name": "MaxApprovedSubmitters",
      "msg": "Max Number of Approved Submitters already reached"
    },
    {
      "code": 6003,
      "name": "MinApprovedSubmitters",
      "msg": "Max Number of Approved Submitters already reached"
    },
    {
      "code": 6004,
      "name": "PendingRequestAlreadySubmitted",
      "msg": "There is an active request already present"
    },
    {
      "code": 6005,
      "name": "NoActiveRequest",
      "msg": "No Request Submitted yet"
    },
    {
      "code": 6006,
      "name": "CannotPayFee",
      "msg": "Insufficient funds to pay lancer fee"
    },
    {
      "code": 6007,
      "name": "CannotCancelFeature",
      "msg": "Cannot Cancel Feature"
    },
    {
      "code": 6008,
      "name": "InvalidAdmin",
      "msg": "You are not the Admin"
    },
    {
      "code": 6009,
      "name": "NotApprovedSubmitter",
      "msg": "You do not have permissions to submit"
    },
    {
      "code": 6010,
      "name": "ExpectedSingleSubmitter",
      "msg": "This Instruction is used for only a single submitter."
    },
    {
      "code": 6011,
      "name": "ExpectedMultipleSubmitters",
      "msg": "This Instruction is used for only Multiple submitters."
    },
    {
      "code": 6012,
      "name": "MaxShareExceeded",
      "msg": "Share Cannot Exceed 100"
    },
    {
      "code": 6013,
      "name": "ShareMustBe100",
      "msg": "Share must be 100"
    },
    {
      "code": 6014,
      "name": "NotOwnedBySplToken",
      "msg": "Token Error"
    }
  ]
};
