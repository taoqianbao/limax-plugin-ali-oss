/**
 * PeterZhu@limax
 */
import * as vscode from 'vscode';

class OutputChannelManager {
  private static instance: vscode.OutputChannel;

  private constructor() {}

  public static getInstance(): vscode.OutputChannel {
    if (!OutputChannelManager.instance) {
      OutputChannelManager.instance = vscode.window.createOutputChannel('Limax Plugin Ali OSS');
    }
    return OutputChannelManager.instance;
  }
}

export const getOutputChannel = (): vscode.OutputChannel => {
  return OutputChannelManager.getInstance();
};