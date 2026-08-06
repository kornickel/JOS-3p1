# -*- coding: utf-8 -*-
import sys
import os
sys.path.append(os.path.dirname(__file__) + "/src")

import jos3
from jos3 import JOS3

if __name__ == "__main__":
    mod = JOS3(ex_output="all")
    mod.PAR = 2
    mod.To = 40
    mod.RH = 70
    mod.Va = 2
    mod.Icl = 0.6
    mod.Icl_airperm = 0      # windproof (scalar -> broadcast to all segments); internally clamped to a small minimum value > 0
    mod.Icl_evap_eff = 0.1      # 10% evaporative efficiency (equivalent to iclo)
    mod.Icl_emissivity = 0.1    # 10% clothing emissivity
    mod.Icl_water_abs = 0.3     # 30% of the sweat produced is absorbed and stored in the fabric
    mod.release_tau = 3600      # stored moisture is released over one hour
    mod.max_storage = 80        # storage capacity of 80 g per segment
    mod.simulate(60)

    d = mod.dict_results()
    # for k in d.keys():
    #     print(jos3.remove_bodyname(k))
    mod.to_csv(folder="E:/desktop")


    mod = JOS3()
    print("\nNeutral")
    print("TcrHead: {:.3f} [oC]".format(mod.Tcr[0]))
    print("TskMean: {:.3f} [oC]".format(mod.TskMean))

    mod = JOS3()
    mod.PAR = 2
    mod.To = 40
    mod.RH = 70
    mod.Va = 2
    mod.Icl = 0.6
    mod.Icl_airperm = 0       # windproof (scalar -> broadcast to all segments); internally clamped to a small minimum value > 0
    mod.Icl_evap_eff = 0.1      # 10% evaporative efficiency (equivalent to iclo)
    mod.Icl_emissivity = 0.1    # 10% clothing emissivity
    mod.Icl_water_abs = 0.3     # 30% of the sweat produced is absorbed and stored in the fabric
    mod.release_tau = 3600      # stored moisture is released over one hour
    mod.max_storage = 80        # storage capacity of 80 g per segment
    # mod._iclo = 0.45
    mod.simulate(60)
    print("\nAfter Hot Exposure")
    print("TcrHead: {:.3f} [oC]".format(mod.Tcr[0]))
    print("TskMean: {:.3f} [oC]".format(mod.TskMean))

    mod = JOS3()
    mod.PAR = 1.2
    mod.To = 10
    mod.RH = 20
    mod.Va = 3
    mod.Icl = 0.1
    mod.Icl_airperm = 0       # windproof (scalar -> broadcast to all segments); internally clamped to a small minimum value > 0
    mod.Icl_evap_eff = 0.1      # 10% evaporative efficiency (equivalent to iclo)
    mod.Icl_emissivity = 0.1    # 10% clothing emissivity
    mod.Icl_water_abs = 0.3     # 30% of the sweat produced is absorbed and stored in the fabric
    mod.release_tau = 3600      # stored moisture is released over one hour
    mod.max_storage = 80        # storage capacity of 80 g per segment
    mod.simulate(60)
    print("\nAfter Cold Exposure")
    print("TcrHead: {:.3f} [oC]".format(mod.Tcr[0]))
    print("TskMean: {:.3f} [oC]".format(mod.TskMean))

    # Measure calculation time
    import time
    stime = time.time()
    mod = JOS3()
    mod.To = 30
    mod.simulate(60)
    mod.To = 20
    mod.simulate(60)
    mod.To = 40
    mod.simulate(60)
    mod.To = 10
    mod.simulate(60)
    etime = time.time()
    print("Default output")
    print("Calculation time {:.2f} [sec]".format(etime-stime))

    stime = time.time()
    mod = JOS3(ex_output=["BFsk", "BFcr", "Emax"])
    mod.To = 30
    mod.simulate(60)
    mod.To = 20
    mod.simulate(60)
    mod.To = 40
    mod.simulate(60)
    mod.To = 10
    mod.simulate(60)
    etime = time.time()
    print("Extra output")
    print("Calculation time {:.2f} [sec]".format(etime-stime))

    stime = time.time()
    mod = JOS3(ex_output="all")
    mod.To = 30
    mod.simulate(60)
    mod.To = 20
    mod.simulate(60)
    mod.To = 40
    mod.simulate(60)
    mod.To = 10
    mod.simulate(60)
    etime = time.time()
    print("All output")
    print("Calculation time {:.2f} [sec]".format(etime-stime))
