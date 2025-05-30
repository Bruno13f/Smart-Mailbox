export function createAEBody(acpRI: string, aeName: string, acmeUrl: string) {
    return {
        "m2m:ae": {
            "rn": aeName, 
            "api": `N${aeName}`, 
            "rr": true, // permitir notificações
            "poa": [acmeUrl+aeName], 
            "acpi": [acpRI],
            "srv": ["1"] // comunicação e enviar notificações
        }
    };
}
