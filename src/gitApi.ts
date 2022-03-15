import { relative } from 'path';
import { commands, extensions, Uri, window } from 'vscode';
import { API, GitExtension, Repository } from './git';

export class GitAPi {

    private static api: Promise<API>;
    static gitExecutablePath: any;
    public static async getApi() {
        this.api = new Promise(async resolve => {
            const extension = extensions.getExtension<GitExtension>('vscode.git');
            if (!extension?.isActive) {
                await extension?.activate();
            }
            const api = extension!.exports.getAPI(1);
            // Wait for the API to get initialized.
            api.onDidChangeState(() => {
                if (api.state === 'initialized') {
                    resolve(api);
                }
            });
            if (api.state === 'initialized') {
                resolve(api);
            }
        });
        this.gitExecutablePath = this.api.then(api => api.git.path);
        return this.api;
    }

    public static async getRepo(): Promise<Repository> {
        const gitApi = await GitAPi.getApi();
        const currentIndex = gitApi.repositories.length === 1 ? 0 : gitApi.repositories.findIndex(x => x.ui.selected);
        return gitApi.repositories[currentIndex];
    }

    public static async getRelative(uri: Uri): Promise<string> {
        const repo = await this.getRepo();
        const gitRoot = repo.rootUri.fsPath;
        return relative(gitRoot, uri.fsPath).replace(/\\/g, '/');
    }

    public static async quickSync() {
        const repo = await this.getRepo();
        if (repo.state.workingTreeChanges.length > 0 || repo.state.indexChanges.length > 0) {
            if (!repo.inputBox.value) {
                const confirm = await window.showQuickPick(["YES", "NO"], { placeHolder: "Are you want to quick sync?", ignoreFocusOut: true })
                if (confirm == "YES") {
                    repo.inputBox.value = 'Quick Sync'
                } else {
                    return;
                }
            }
            commands.executeCommand("git.stageAll").then(() => {
                commands.executeCommand("git.commitStaged").then(() => {
                    commands.executeCommand("git.sync")
                });
            });
        } else {
            commands.executeCommand("git.sync")
        }
    }

}