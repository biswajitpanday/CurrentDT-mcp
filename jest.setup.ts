import { Logger } from './src/utils/Logger';

// Several tests deliberately trigger error paths. The logger writes those to stderr,
// which buries the actual test output, so keep it quiet unless a test opts back in.
Logger.getInstance().setLogLevel('fatal');
