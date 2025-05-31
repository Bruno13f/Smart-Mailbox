export function createContainerBody(cntName: string) {
  return {
    "m2m:cnt": {
      rn: cntName,
      mni: 1000, // <--- número máximo de ContentInstance
    },
  };
}
