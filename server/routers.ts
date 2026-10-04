import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { buildInsights, getDemoDay, getDemoWeek, getZones } from "./thermal";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), {
        ...cookieOptions,
        maxAge: -1,
      });
      return {
        success: true,
      } as const;
    }),
  }),

  thermal: router({
    zones: publicProcedure.query(() => getZones()),
    weather: publicProcedure.query(() => ({ temp: 34, feelsLike: 38, humidity: 72, uvIndex: 4, description: "estimated outdoor conditions", cached: false, estimated: true })),
    dashboard: publicProcedure.query(() => ({ score: 147.9, riskLevel: "critical", transitions: getDemoDay(), totalTransitions: 7, peakShock: 25.5 })),
    history: publicProcedure.query(() => getDemoWeek()),
    insights: publicProcedure.query(() => buildInsights()),
    demoDay: publicProcedure.mutation(() => ({ loaded: true, transitions: getDemoDay() })),
    demoWeek: publicProcedure.mutation(() => ({ loaded: true, days: 7, totalTransitions: 27, week: getDemoWeek() })),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
