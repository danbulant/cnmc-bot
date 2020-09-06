

module.exports = class Router {
    /**
     * @type {{
        path: string,
        callback: function(Message): boolean | string,
        break: boolean,
        opts: {
            guildOnly: boolean,
            permissions: string[],
            clientPermissions: string[],
            ownerOnly: boolean
        }
    }[]} middlewares
     */
    middlewares = [];

    constructor(name) {
        this.name = name;
    }

    /**
     * Registers a command
     * @param {string} path command format
     * @param {function(Message): boolean | string} callback to call on match
     * @param {{
        guildOnly: boolean,
        permissions: string[],
        clientPermissions: string[]
     }} opts options to use
     */
    command(path, callback, opts = {}) {
        this.middlewares.push({
            path,
            callback,
            opts,
            break: true
        });

        return this;
    }

    /**
     * Registers a middleware
     * @param {string} path 
     * @param {function|Router} router 
     * @param {{
        guildOnly: boolean,
        permissions: string[],
        clientPermissions: string[]
     }} opts 
     */
    use(path, router, opts = {}) {
        if(typeof path !== "string") {
            [router, opts] = [path, router];
            path = "";
        }
        if(typeof router === "function") {
            this.middlewares.push({
                path,
                callback: router,
                opts,
                break: false
            });
            return this;
        }
        if(router instanceof Router) {
            this.middlewares.push({
                callback: (...args) => router.message(...args),
                path: (path).trim(),
                opts: Object.assign(router.opts, opts),
                break: opts ? !!opts.break : false
            })
            return this;
        }
        if(!router.middlewares) throw new Error("Unknown middleware type");
        for(var middleware of router.middlewares) {
            this.middlewares.push({
                ...middleware,
                path: (path + " " + middleware.path).trim(),
                opts: Object.assign({}, middleware.opts, opts)
            });
        }
        return this;
    }

    processPath(path, content) {
        if(!path) return {};
        var segments = path.split(" ");
        var contentSegments = content.split(" ");
        if(!contentSegments) return null;
        if(segments.length > contentSegments.length) return null;
        var args = {};
        for(var segmentID in segments) {
            var segment = segments[segmentID];
            if(segment.startsWith(":")) {
                args[segment.substr(1)] = contentSegments[segmentID];
            } else if(segment !== contentSegments[segmentID]) return null;
        }
        var keys = segments.filter(segment => segment.startsWith(":")).map(segment => segment.substr(1));
        if(contentSegments.length > segments.length && keys.length) {
            args[keys[keys.length - 1]] += contentSegments.splice(segments.length).join(" ");
        }
        return args;
    }

    /**
     * 
     * @param {Message} msg 
     * @param {{
        guildOnly: boolean,
        permissions: string[],
        clientPermissions: string[]
     }} opts options to use
     */
    async checkOpts(msg, opts) {
        if(!opts) return true;
        if(!msg.guild && opts.guildOnly) return false;
        if(opts.permissions && msg.member)
            for(var permission of opts.permissions)
                if(!msg.member.hasPermission(permission)) return false;
        if(opts.clientPermissions && msg.guild.me)
            for(var permission of opts.clientPermissions)
                if(!msg.guild.me.hasPermission(permission)) return false;
        return true;
    }

    async message(msg) {
        var middlewares = this.middlewares;

        for(var middleware of middlewares) {
            var args = this.processPath(middleware.path, msg.content);
            if(args === null) continue;
            if(!this.checkOpts(msg, middleware.opts)) continue;
            var result = await middleware.callback(msg, args);
            if(typeof result === "string") {
                await msg.channel.send(result);
            }
            if(middleware.break || result === false) {
                return false;
            }
        }
    }
}