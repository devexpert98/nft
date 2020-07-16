const fs = require('fs');
const { join } = require('path');
const { nodeFileTrace } = require('../out/node-file-trace');

global._unit = true;

for (const unitTest of fs.readdirSync(join(__dirname, 'unit'))) {
  if (process.platform === 'win32' && ['yarn-workspaces', 'yarn-workspace-esm', 'asset-symlink', 'require-symlink'].includes(unitTest)) {
    console.log('skipping symlink test on Windows: ' + unitTest);
    continue;
  }
  it(`should correctly trace ${unitTest}`, async () => {
    const unitPath = join(__dirname, 'unit', unitTest);

    // We mock readFile because when node-file-trace is integrated into @now/node
    // this is the hook that triggers TypeScript compilation. So if this doesn't
    // get called, the TypeScript files won't get compiled: Currently this is only
    // used in the tsx-input test:
    const readFileMock = jest.fn(function() {
      return this.constructor.prototype.readFile.apply(this, arguments);
    });

    let inputFileName = "input.js";

    if (unitTest === "tsx-input") {
      inputFileName = "input.tsx";
    }

    const { fileList, reasons } = await nodeFileTrace([join(unitPath, inputFileName)], {
      base: `${__dirname}/../`,
      processCwd: unitPath,
      paths: {
        dep: 'test/unit/esm-paths/esm-dep.js',
        'dep/': 'test/unit/esm-paths-trailer/'
      },
      exportsOnly: unitTest.startsWith('exports-only'),
      ts: true,
      log: true,
      // disable analysis for basic-analysis unit tests
      analysis: !unitTest.startsWith('basic-analysis'),
      mixedModules: true,
      ignore: '**/actual.js',
      readFile: readFileMock
    });
    let expected;
    try {
      expected = JSON.parse(fs.readFileSync(join(unitPath, 'output.js')).toString());
      if (process.platform === 'win32') {
        // When using Windows, the expected output should use backslash
        expected = expected.map(str => str.replace(/\//g, '\\'));
      }
    }
    catch (e) {
      console.warn(e);
      expected = [];
    }
    try {
      expect(fileList).toEqual(expected);
    }
    catch (e) {
      console.warn(reasons);
      fs.writeFileSync(join(unitPath, 'actual.js'), JSON.stringify(fileList, null, 2));
      throw e;
    }

    if (unitTest === "tsx-input") {
      expect(readFileMock.mock.calls.length).toBe(2);
    }
  });
}
