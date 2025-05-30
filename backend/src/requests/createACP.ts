export function createACPBody(acpName: string, aeName: string, permissions: number) {
    return {
      "m2m:acp": {
        "rn": acpName,
        "pv": {
          "acr": [
            {
              "acor": [aeName],
              "acop": permissions
            }
          ]
        },
        "pvs": {
          "acr": [
            {
              "acor": [aeName], 
              "acop": permissions
            }
          ]
        },
      }
    };
  }
  