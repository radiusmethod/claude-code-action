import * as core from "@actions/core";
import type { Mode, ModeContext, ModeOptions, ModeResult } from "../types";
import { isPushEvent } from "../../github/context";
import { generateDefaultPrompt } from "../../create-prompt"; // Adjust if needed
import { mkdir, writeFile } from "fs/promises";
import type { Commit } from "@octokit/webhooks-types"; // For commit types
import type * as node from "node";

export const releaseNotesMode: Mode = {
  name: "release-notes" as ModeName,
  description: "Generate release notes on push events",

  shouldTrigger(context) {
    if (!isPushEvent(context)) return false;
    const targetBranch = (context.inputs as any).target_branch || "main";
    return context.payload.ref === `refs/heads/${targetBranch}`;
  },

  prepareContext(context, data?): ModeContext {
    // Implement based on needs; return a ModeContext object
    const commits = context.payload.commits?.map((c: Commit) => `${c.id.slice(0,7)}: ${c.message}`).join('\n') || "No commits";
    return { ...data, commitHistory: commits } as CustomModeContext; // Ensure this matches ModeContext type
  },

  getAllowedTools() {
    return ["Read", "Grep", "Glob"]; // Customize as needed
  },

  getDisallowedTools() {
    return ["WebSearch"]; // Example
  },

  shouldCreateTrackingComment() {
    return false; // Like agent mode
  },

  generatePrompt(context, githubData, useCommitSigning) {
    const basePrompt = generateDefaultPrompt(context, githubData, useCommitSigning);
    return `${basePrompt}\n\nGenerate release notes from commits: ${context.commitHistory}`;
  },

  // Update prepare method to be async and implement full logic (replace the placeholder)
  async prepare({ context }: ModeOptions): Promise<ModeResult> {
    await mkdir(`${process.env.RUNNER_TEMP || "/tmp"}/claude-prompts`, { recursive: true });
    const promptContent = context.inputs.overridePrompt || context.inputs.directPrompt || `Generate release notes for repository: ${context.repository.owner}/${context.repository.repo}`;
    await writeFile(`${process.env.RUNNER_TEMP || "/tmp"}/claude-prompts/claude-prompt.txt`, promptContent);

    const baseTools = ["Edit", "Read", "Grep", "Glob"];
    const allowedTools = [...baseTools, ...context.inputs.allowedTools];
    const disallowedTools = ["WebSearch", ...context.inputs.disallowedTools];
    core.exportVariable("ALLOWED_TOOLS", allowedTools.join(","));
    core.exportVariable("DISALLOWED_TOOLS", disallowedTools.join(","));

    const mcpConfig = { mcpServers: {} };
    // Add additional MCP config if provided
    const additionalMcpConfig = process.env.MCP_CONFIG || "";
    if (additionalMcpConfig.trim()) {
      Object.assign(mcpConfig, JSON.parse(additionalMcpConfig));
    }

    return { 
      success: true, 
      mcpConfig,
      branchInfo: { baseBranch: "", claudeBranch: "" },
      commentId: undefined
    };
  },

  getSystemPrompt(context: ModeContext): string | undefined {
    return "You are a release notes generator. Summarize changes categorically.";
  }
};
